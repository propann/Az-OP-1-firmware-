from __future__ import annotations

import binascii
import io
import lzma
from pathlib import Path
import struct
import sys
import tarfile
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parent))
import op1lab


def diagnostic_ldr() -> bytes:
    def header(code: int, target: int, count: int, argument: int = 0) -> bytes:
        data = bytearray(struct.pack("<IIII", code, target, count, argument))
        checksum = 0
        for value in data:
            checksum ^= value
        data[2] ^= checksum
        return bytes(data)

    payload = b"\x00\x00"
    return (header(op1lab.SIGNATURE | op1lab.FLAG_FIRST, 0x1000, len(payload)) + payload
            + header(op1lab.SIGNATURE | op1lab.FLAG_FINAL, 0x1000, 0))


def synthetic_op1(files: dict[str, bytes]) -> bytes:
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w", format=tarfile.GNU_FORMAT) as bundle:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            bundle.addfile(info, io.BytesIO(data))
    payload = lzma.compress(stream.getvalue(), format=lzma.FORMAT_ALONE, filters=op1lab.LZMA_FILTERS)
    return struct.pack("<I", binascii.crc32(payload) & 0xFFFFFFFF) + payload


class Op1LabTests(unittest.TestCase):
    def test_parse_ldr(self) -> None:
        report = op1lab.parse_ldr(diagnostic_ldr())
        self.assertTrue(report["valid"])
        self.assertEqual(report["entry_point"], "0x00001000")
        self.assertEqual(len(report["blocks"]), 2)

    def test_rejects_bad_crc(self) -> None:
        raw = bytearray(synthetic_op1({"OP1_vdk.ldr": diagnostic_ldr()}))
        raw[-1] ^= 1
        self.assertFalse(op1lab.parse_op1(bytes(raw))["valid"])

    def test_safe_unpack_and_repack_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            original = root / "test.op1"
            original.write_bytes(synthetic_op1({"boot/te-boot.ldr": diagnostic_ldr(), "version.txt": b"test\n"}))
            unpacked = root / "unpacked"
            result = op1lab.unpack_op1(original, unpacked)
            self.assertEqual(result["files"], 2)
            rebuilt = root / "rebuilt.op1"
            op1lab.repack_op1(unpacked, rebuilt)
            report = op1lab.parse_op1(rebuilt.read_bytes())
            self.assertTrue(report["valid"])
            second = root / "second"
            op1lab.unpack_op1(rebuilt, second)
            diff = op1lab.compare_paths(unpacked, second)
            self.assertEqual(diff["added"], [])
            self.assertEqual(diff["removed"], [])
            self.assertEqual(diff["changed"], [])

    def test_rejects_path_traversal(self) -> None:
        raw = synthetic_op1({"../escape": b"no"})
        report = op1lab.parse_op1(raw)
        self.assertFalse(report["valid"])
        self.assertTrue(any("dangereux" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()

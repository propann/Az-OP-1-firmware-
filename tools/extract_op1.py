#!/usr/bin/env python3
"""Validate an OP-1 update and extract only its LDR files."""

from __future__ import annotations

import argparse
import binascii
import io
import lzma
from pathlib import Path, PurePosixPath
import struct
import tarfile


def extract_ldr(container_path: Path, output_dir: Path) -> list[Path]:
    raw = container_path.read_bytes()
    if len(raw) < 17:
        raise ValueError("conteneur OP-1 trop court")

    expected_crc = struct.unpack("<I", raw[:4])[0]
    payload = raw[4:]
    actual_crc = binascii.crc32(payload) & 0xFFFFFFFF
    if expected_crc != actual_crc:
        raise ValueError(
            f"CRC32 invalide: attendu {expected_crc:08X}, calculé {actual_crc:08X}"
        )

    archive = lzma.decompress(payload, format=lzma.FORMAT_ALONE)
    output_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []

    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as bundle:
        for member in bundle.getmembers():
            source = PurePosixPath(member.name)
            if not member.isfile() or source.suffix.lower() != ".ldr":
                continue
            stream = bundle.extractfile(member)
            if stream is None:
                continue
            target = output_dir / source.name
            if target.exists():
                target = output_dir / ("_".join(source.parts))
            target.write_bytes(stream.read())
            extracted.append(target)

    if not extracted:
        raise ValueError("aucun fichier LDR trouvé dans le conteneur")
    return extracted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("firmware", type=Path)
    parser.add_argument("--output", type=Path, default=Path("firmware") / "extracted")
    args = parser.parse_args()
    for path in extract_ldr(args.firmware, args.output):
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


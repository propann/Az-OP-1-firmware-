#!/usr/bin/env python3
"""OP-1 firmware study toolkit (container and BF52x LDR analysis).

This utility never flashes hardware. It uses only Python's standard library and
is deliberately strict when extracting untrusted archives.
"""

from __future__ import annotations

import argparse
import binascii
import hashlib
import io
import json
import lzma
from pathlib import Path, PurePosixPath
import struct
import tarfile
from typing import Any, Iterable


LZMA_FILTERS = [{
    "id": lzma.FILTER_LZMA1,
    "preset": 9,
    "lc": 3,
    "lp": 1,
    "pb": 2,
    "dict_size": 2**23,
}]
HEADER_SIZE = 16
SIGNATURE_MASK = 0xFF000000
SIGNATURE = 0xAD000000
FLAG_FILL = 0x00000100
FLAG_INIT = 0x00000800
FLAG_IGNORE = 0x00001000
FLAG_FIRST = 0x00004000
FLAG_FINAL = 0x00008000


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _safe_name(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError(f"chemin TAR dangereux: {name!r}")
    return path


def parse_ldr(raw: bytes) -> dict[str, Any]:
    blocks: list[dict[str, Any]] = []
    errors: list[str] = []
    offset = 0
    final_seen = False
    entry_point: int | None = None

    while offset + HEADER_SIZE <= len(raw) and not final_seen:
        code, target, count, argument = struct.unpack_from("<IIII", raw, offset)
        header = raw[offset:offset + HEADER_SIZE]
        fill = bool(code & FLAG_FILL)
        final = bool(code & FLAG_FINAL)
        ignored = bool(code & FLAG_IGNORE)
        payload_size = 0 if fill or final else count
        payload_offset = offset + HEADER_SIZE
        index = len(blocks)
        signature_valid = code & SIGNATURE_MASK == SIGNATURE
        checksum_valid = not _xor(header)
        if not signature_valid:
            errors.append(f"bloc {index}: signature 0xAD absente")
        if not checksum_valid:
            errors.append(f"bloc {index}: checksum XOR d'en-tête invalide")
        if payload_offset + payload_size > len(raw):
            errors.append(f"bloc {index}: charge utile hors fichier")
            break
        flags = [name for bit, name in (
            (FLAG_FIRST, "FIRST"), (FLAG_INIT, "INIT"), (FLAG_FILL, "FILL"),
            (FLAG_IGNORE, "IGNORE"), (FLAG_FINAL, "FINAL"),
        ) if code & bit]
        blocks.append({
            "index": index,
            "header_offset": offset,
            "payload_offset": payload_offset,
            "block_code": f"0x{code:08X}",
            "target_address": f"0x{target:08X}",
            "byte_count": count,
            "argument": f"0x{argument:08X}",
            "flags": flags,
            "signature_valid": signature_valid,
            "header_checksum_valid": checksum_valid,
            "payload_sha256": None if fill or final else sha256(raw[payload_offset:payload_offset + count]),
        })
        if final:
            final_seen = True
            entry_point = target
        offset = payload_offset + payload_size

    if not final_seen:
        errors.append("aucun bloc FINAL BF52x")
    return {
        "format": "ldr-bf52x",
        "size": len(raw),
        "sha256": sha256(raw),
        "valid": bool(blocks) and not errors,
        "entry_point": None if entry_point is None else f"0x{entry_point:08X}",
        "blocks": blocks,
        "trailing_bytes": len(raw) - offset if final_seen else 0,
        "errors": errors,
    }


def parse_op1(raw: bytes, include_members: bool = True) -> dict[str, Any]:
    errors: list[str] = []
    if len(raw) < 17:
        return {"format": "op1-container", "size": len(raw), "valid": False,
                "errors": ["conteneur OP-1 trop court"]}
    stored_crc = struct.unpack_from("<I", raw)[0]
    payload = raw[4:]
    actual_crc = binascii.crc32(payload) & 0xFFFFFFFF
    if stored_crc != actual_crc:
        errors.append(f"CRC32 invalide: attendu {stored_crc:08X}, calculé {actual_crc:08X}")
    # LZMA-Alone encode (pb, lp, lc) in one byte. Firmware originals are often
    # 0x5D; the public op1repacker settings (lc=3, lp=1, pb=2) produce 0x66.
    if payload[0] >= 9 * 5 * 5:
        errors.append(f"propriétés LZMA-Alone invalides: 0x{payload[0]:02X}")
    archive: bytes | None = None
    try:
        archive = lzma.decompress(payload, format=lzma.FORMAT_ALONE)
    except lzma.LZMAError as exc:
        errors.append(f"décompression LZMA impossible: {exc}")
    members: list[dict[str, Any]] = []
    if archive is not None:
        try:
            with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as bundle:
                if include_members:
                    for member in bundle.getmembers():
                        _safe_name(member.name)
                        members.append({
                            "name": member.name,
                            "size": member.size,
                            "type": "file" if member.isfile() else "directory" if member.isdir() else "other",
                            "mode": f"0o{member.mode:o}",
                        })
        except (tarfile.TarError, ValueError) as exc:
            errors.append(f"archive TAR invalide: {exc}")
    return {
        "format": "op1-container",
        "size": len(raw),
        "sha256": sha256(raw),
        "payload_sha256": sha256(payload),
        "stored_crc32": f"{stored_crc:08X}",
        "calculated_crc32": f"{actual_crc:08X}",
        "crc32_valid": stored_crc == actual_crc,
        "lzma_properties": f"0x{payload[0]:02X}",
        "lzma_dictionary_size": struct.unpack_from("<I", payload, 1)[0],
        "tar_size": None if archive is None else len(archive),
        "members": members,
        "valid": not errors,
        "errors": errors,
    }


def inspect_path(path: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    suffix = path.suffix.lower()
    if suffix == ".op1" or (len(raw) >= 5 and raw[4] == 0x5D):
        report = parse_op1(raw)
    elif suffix == ".ldr" or (len(raw) >= 4 and struct.unpack_from("<I", raw)[0] & SIGNATURE_MASK == SIGNATURE):
        report = parse_ldr(raw)
    else:
        report = {"format": "unknown", "size": len(raw), "sha256": sha256(raw),
                  "valid": False, "errors": ["format non reconnu"]}
    report["path"] = str(path)
    return report


def unpack_op1(source: Path, output: Path) -> dict[str, Any]:
    if output.exists() and any(output.iterdir()):
        raise FileExistsError(f"destination non vide: {output}")
    raw = source.read_bytes()
    report = parse_op1(raw)
    if not report["valid"]:
        raise ValueError("; ".join(report["errors"]))
    archive = lzma.decompress(raw[4:], format=lzma.FORMAT_ALONE)
    output.mkdir(parents=True, exist_ok=True)
    extracted: list[str] = []
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as bundle:
        for member in bundle.getmembers():
            relative = _safe_name(member.name)
            target = output.joinpath(*relative.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if not member.isfile():
                raise ValueError(f"type TAR refusé pour sécurité: {member.name}")
            stream = bundle.extractfile(member)
            if stream is None:
                raise ValueError(f"contenu TAR illisible: {member.name}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(stream.read())
            target.chmod(member.mode & 0o777)
            extracted.append(relative.as_posix())
    manifest = {
        "schema": 1,
        "source": source.name,
        "source_sha256": sha256(raw),
        "stored_crc32": report["stored_crc32"],
        "files": extracted,
    }
    (output / ".op1lab-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {"output": str(output), "files": len(extracted), "manifest": manifest}


def _iter_repack_paths(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix()):
        relative = path.relative_to(root)
        if any(part.startswith(".") for part in relative.parts):
            continue
        if path.is_symlink():
            raise ValueError(f"lien symbolique refusé: {relative}")
        yield path


def repack_op1(source: Path, output: Path) -> dict[str, Any]:
    if not source.is_dir():
        raise NotADirectoryError(source)
    if output.exists():
        raise FileExistsError(f"sortie existante: {output}")
    archive_io = io.BytesIO()
    with tarfile.open(fileobj=archive_io, mode="w", format=tarfile.GNU_FORMAT) as bundle:
        for path in _iter_repack_paths(source):
            relative = path.relative_to(source).as_posix()
            info = bundle.gettarinfo(str(path), arcname=relative)
            info.uid = info.gid = 0
            info.uname = info.gname = "root"
            info.mtime = 0
            if path.is_file():
                with path.open("rb") as stream:
                    bundle.addfile(info, stream)
            elif path.is_dir():
                bundle.addfile(info)
            else:
                raise ValueError(f"type de fichier refusé: {relative}")
    payload = lzma.compress(archive_io.getvalue(), format=lzma.FORMAT_ALONE, filters=LZMA_FILTERS)
    crc = binascii.crc32(payload) & 0xFFFFFFFF
    raw = struct.pack("<I", crc) + payload
    verification = parse_op1(raw)
    if not verification["valid"]:
        raise RuntimeError("échec de vérification interne du repack")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(raw)
    return {"output": str(output), "size": len(raw), "sha256": sha256(raw),
            "crc32": f"{crc:08X}", "members": len(verification["members"])}


def _inventory(path: Path) -> dict[str, str]:
    if path.is_file():
        return {path.name: sha256(path.read_bytes())}
    return {item.relative_to(path).as_posix(): sha256(item.read_bytes())
            for item in sorted(path.rglob("*")) if item.is_file() and not item.name.startswith(".op1lab-")}


def compare_paths(left: Path, right: Path) -> dict[str, Any]:
    a, b = _inventory(left), _inventory(right)
    names = sorted(set(a) | set(b))
    return {
        "left": str(left), "right": str(right),
        "added": [name for name in names if name not in a],
        "removed": [name for name in names if name not in b],
        "changed": [name for name in names if name in a and name in b and a[name] != b[name]],
        "unchanged": sum(1 for name in names if name in a and name in b and a[name] == b[name]),
    }


def scan_corpus(root: Path) -> dict[str, Any]:
    files = sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in {".op1", ".ldr"})
    return {"schema": 1, "root": str(root), "files": [inspect_path(path) for path in files]}


def _xor(data: bytes) -> int:
    result = 0
    for value in data:
        result ^= value
    return result


def _print(report: dict[str, Any], compact: bool = False) -> None:
    print(json.dumps(report, indent=None if compact else 2, ensure_ascii=False, sort_keys=True))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="op1lab", description="Laboratoire d'étude OP-1 original (aucun flash matériel)")
    sub = parser.add_subparsers(dest="command", required=True)
    inspect = sub.add_parser("inspect", help="identifier et valider un .op1 ou .ldr")
    inspect.add_argument("input", type=Path)
    unpack = sub.add_parser("unpack", help="extraire sûrement tout le contenu d'un .op1")
    unpack.add_argument("input", type=Path)
    unpack.add_argument("--output", "-o", type=Path, required=True)
    repack = sub.add_parser("repack", help="reconstruire un .op1 d'étude et le revalider")
    repack.add_argument("input", type=Path)
    repack.add_argument("--output", "-o", type=Path, required=True)
    compare = sub.add_parser("compare", help="comparer deux fichiers ou arborescences par SHA-256")
    compare.add_argument("left", type=Path)
    compare.add_argument("right", type=Path)
    corpus = sub.add_parser("corpus", help="indexer les .op1/.ldr d'un corpus local")
    corpus.add_argument("input", type=Path)
    corpus.add_argument("--output", "-o", type=Path)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "inspect":
            report = inspect_path(args.input)
        elif args.command == "unpack":
            report = unpack_op1(args.input, args.output)
        elif args.command == "repack":
            report = repack_op1(args.input, args.output)
        elif args.command == "compare":
            report = compare_paths(args.left, args.right)
        else:
            report = scan_corpus(args.input)
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                report = {"output": str(args.output), "files": len(report["files"])}
        _print(report)
        return 0
    except (OSError, ValueError, RuntimeError, tarfile.TarError, lzma.LZMAError) as exc:
        _print({"error": str(exc)})
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

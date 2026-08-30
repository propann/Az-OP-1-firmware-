#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
QEMU_BIN="$PROJECT_ROOT/.cache/qemu-bfin/build/qemu-system-bfin"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 chemin/vers/te-boot.ldr" >&2
  exit 2
fi
if [ ! -x "$QEMU_BIN" ]; then
  echo "Moteur absent. Lancez native/build-qemu-bfin.sh." >&2
  exit 1
fi
if [ ! -f "$1" ]; then
  echo "Fichier LDR introuvable: $1" >&2
  exit 1
fi

exec "$QEMU_BIN" \
  -M op1-bf524 \
  -kernel "$1" \
  -nographic \
  -no-reboot \
  -d guest_errors,unimp

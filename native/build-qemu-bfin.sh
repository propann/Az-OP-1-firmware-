#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
QEMU_COMMIT="ae8fe9a85080fab503230411af068507af91a36c"
QEMU_SRC_DIR="$PROJECT_ROOT/.cache/qemu-bfin"
PATCH_FILE="$PROJECT_ROOT/native/patches/qemu-op1-bf524.patch"

for command_name in git python3 meson ninja cc pkg-config; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Dépendance absente: $command_name" >&2
    exit 1
  fi
done

if [ ! -d "$QEMU_SRC_DIR/.git" ]; then
  mkdir -p "$(dirname "$QEMU_SRC_DIR")"
  git clone https://github.com/vapier/qemu.git "$QEMU_SRC_DIR"
fi

git -C "$QEMU_SRC_DIR" fetch origin bfin
git -C "$QEMU_SRC_DIR" checkout --detach "$QEMU_COMMIT"

if git -C "$QEMU_SRC_DIR" apply --check "$PATCH_FILE" 2>/dev/null; then
  git -C "$QEMU_SRC_DIR" apply "$PATCH_FILE"
elif ! git -C "$QEMU_SRC_DIR" apply --reverse --check "$PATCH_FILE" 2>/dev/null; then
  echo "Le patch OP-1 ne correspond pas à la révision QEMU épinglée." >&2
  exit 1
fi

cd "$QEMU_SRC_DIR"
./configure --target-list=bfin-softmmu --disable-werror --disable-docs
ninja -C build qemu-system-bfin

echo "Moteur construit: $QEMU_SRC_DIR/build/qemu-system-bfin"


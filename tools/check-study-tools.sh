#!/usr/bin/env bash
set -eu

required="python3 git make"
recommended="file strings readelf objdump xxd tar xz sha256sum diff"
optional="binwalk radare2 rizin ghidra qemu-system-bfin"
missing_required=0

check_group() {
  label="$1"
  shift
  for command_name in "$@"; do
    if command -v "$command_name" >/dev/null 2>&1; then
      printf '%-12s %-22s %s\n' "$label" "$command_name" "OK"
    else
      printf '%-12s %-22s %s\n' "$label" "$command_name" "ABSENT"
      if [ "$label" = "requis" ]; then missing_required=1; fi
    fi
  done
}

check_group requis $required
check_group recommande $recommended
check_group optionnel $optional
exit "$missing_required"

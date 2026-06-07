#!/usr/bin/env bash
# inventory.sh — Phase 2 of arch-repackage.
# Enumerate packageable filesystem objects under a target root and emit a TSV
# (path, type, size, octal-mode, symlink-target) to stdout.
#
# Pseudo and transient trees (proc, sys, dev, run, tmp, caches, logs) are
# excluded by default because they are runtime state, not OS payload.
#
# Note on systemd v260 mount stacks: the writable upper layer of an
# `.mstack/` directory (`<name>.mstack/rw/data/` and `rw/work/`) is overlayfs
# runtime state. It is NOT pruned by default because the `rw/` fragment is too
# generic to match safely; it is reported like any other path. Phase 4+ and
# references/systemd-taxonomy.md describe how to treat it (ship an empty `rw/`,
# never a populated `rw/data/`). Pass it to --exclude-extra to drop it here.
#
# Note: filenames containing tab or newline would corrupt the TSV. Such names
# are vanishingly rare in OS content; if encountered, exclude that subtree.
set -euo pipefail

ROOT=""
declare -a EXTRA=()

die()  { printf 'inventory.sh: %s\n' "$*" >&2; exit 1; }
usage() {
  cat >&2 <<'EOF'
Usage: inventory.sh --root <DIR> [--exclude-extra <RELPATH>]...

  --root           Target root directory (host "/", a mounted rootfs, etc.)
  --exclude-extra  Additional top-level-relative path to prune (repeatable)

Emits TSV to stdout: path<TAB>type<TAB>size<TAB>octal-mode<TAB>symlink-target
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)          ROOT="${2:-}"; shift 2 ;;
    --exclude-extra) EXTRA+=("${2:-}"); shift 2 ;;
    -h|--help)       usage ;;
    *)               die "unknown argument: $1" ;;
  esac
done
[[ -n "$ROOT" ]] || usage
[[ -d "$ROOT" ]] || die "root is not a directory: $ROOT"

# Normalize: strip trailing slash unless the root is literally "/".
[[ "$ROOT" != "/" ]] && ROOT="${ROOT%/}"
PFX="$ROOT"; [[ "$PFX" == "/" ]] && PFX=""

DEFAULT_EXCLUDES=(
  proc sys dev run tmp var/tmp var/cache var/log lost+found
  var/lib/pacman/sync var/lib/apt/lists var/lib/machines
  media mnt
)
EXCLUDES=( "${DEFAULT_EXCLUDES[@]}" "${EXTRA[@]}" )

# Build the find prune expression: ( -path A -o -path B ... ) -prune
prune=()
firstp=1
for e in "${EXCLUDES[@]}"; do
  [[ -z "$e" ]] && continue
  if [[ $firstp -eq 1 ]]; then prune+=( '(' -path "$PFX/$e" ); firstp=0
  else                         prune+=( -o -path "$PFX/$e" ); fi
done
[[ $firstp -eq 0 ]] && prune+=( ')' -prune )

printf '# path\ttype\tsize\tmode\tlink\n'

if [[ $firstp -eq 1 ]]; then
  find "$ROOT" -mindepth 1 -printf '%p\t%y\t%s\t%m\t%l\n'
else
  find "$ROOT" -mindepth 1 "${prune[@]}" -o -printf '%p\t%y\t%s\t%m\t%l\n'
fi | awk -F'\t' -v pfx="$PFX" 'BEGIN{OFS="\t"}
{
  rel = substr($1, length(pfx) + 1)
  if (rel == "" || rel == "/") next
  print rel, $2, $3, $4, $5
}' | LC_ALL=C sort -t$'\t' -k1,1

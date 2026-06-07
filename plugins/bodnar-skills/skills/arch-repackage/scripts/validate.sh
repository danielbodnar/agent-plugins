#!/usr/bin/env bash
# validate.sh — Phase 6 of arch-repackage.
# Lint a generated package build tree: PKGBUILD syntax, .SRCINFO parity,
# b2sums presence for source builds, optional namcap, and (with --manifest)
# a dependency-closure report over the meta-package tree.
#
# Reports problems; a non-zero exit means at least one hard error was found.
set -euo pipefail

PKGDIR=""
MANIFEST=""

die()  { printf 'validate.sh: %s\n' "$*" >&2; exit 2; }
usage() {
  cat >&2 <<'EOF'
Usage: validate.sh --packages <DIR> [--manifest <JSON>]

  --packages  Directory containing per-package build dirs (emit.sh --out/packages)
  --manifest  Optional repackage-manifest.json for dependency-closure checks

Exit status: 0 = clean, 1 = errors found, 2 = usage/internal error.
EOF
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --packages) PKGDIR="${2:-}";   shift 2 ;;
    --manifest) MANIFEST="${2:-}"; shift 2 ;;
    -h|--help)  usage ;;
    *)          die "unknown argument: $1" ;;
  esac
done
[[ -n "$PKGDIR" ]] || usage
[[ -d "$PKGDIR" ]] || die "packages dir not found: $PKGDIR"
[[ -z "$MANIFEST" || -f "$MANIFEST" ]] || die "manifest not found: $MANIFEST"

ERRORS=0
WARNS=0
err()  { printf 'ERROR  %s\n' "$*"; ERRORS=$((ERRORS + 1)); }
warn() { printf 'WARN   %s\n' "$*"; WARNS=$((WARNS + 1)); }
ok()   { printf 'OK     %s\n' "$*"; }

HAVE_MAKEPKG=0; command -v makepkg >/dev/null 2>&1 && HAVE_MAKEPKG=1
HAVE_NAMCAP=0;  command -v namcap  >/dev/null 2>&1 && HAVE_NAMCAP=1

shopt -s nullglob
PKGBUILDS=( "$PKGDIR"/*/PKGBUILD )
[[ ${#PKGBUILDS[@]} -gt 0 ]] || die "no PKGBUILD files under $PKGDIR"

for pb in "${PKGBUILDS[@]}"; do
  d="$(dirname "$pb")"
  name="$(basename "$d")"

  # 1. syntax
  if bash -n "$pb" 2>/dev/null; then
    ok "$name: PKGBUILD parses"
  else
    err "$name: PKGBUILD has bash syntax errors"
    continue
  fi

  # 2. .SRCINFO parity
  if [[ $HAVE_MAKEPKG -eq 1 ]]; then
    fresh="$(cd "$d" && makepkg --printsrcinfo 2>/dev/null || true)"
    if [[ -z "$fresh" ]]; then
      err "$name: makepkg --printsrcinfo produced no output"
    elif [[ -f "$d/.SRCINFO" ]]; then
      if diff -q <(printf '%s\n' "$fresh") "$d/.SRCINFO" >/dev/null 2>&1; then
        ok "$name: .SRCINFO matches PKGBUILD"
      else
        warn "$name: .SRCINFO is stale (regenerate with makepkg --printsrcinfo)"
      fi
    else
      warn "$name: .SRCINFO missing"
    fi
  else
    [[ -f "$d/.SRCINFO" ]] || warn "$name: .SRCINFO missing (makepkg unavailable)"
  fi

  # 3. b2sums / checksums present when source= is non-empty
  if grep -qE '^\s*source=\(' "$pb"; then
    if grep -qE '^\s*source=\(\s*\)' "$pb"; then
      :  # empty source array, fine
    elif grep -qE '^\s*(b2|sha256|sha512|md5)sums=\(' "$pb"; then
      ok "$name: checksums present for source array"
    else
      err "$name: source= set but no *sums= array"
    fi
  fi

  # 4. namcap
  if [[ $HAVE_NAMCAP -eq 1 ]]; then
    out="$(cd "$d" && namcap PKGBUILD 2>/dev/null || true)"
    if [[ -n "$out" ]]; then
      while IFS= read -r line; do
        [[ -n "$line" ]] && warn "$name: namcap: $line"
      done <<<"$out"
    else
      ok "$name: namcap clean"
    fi
  fi
done

# 5. dependency-closure report
if [[ -n "$MANIFEST" ]] && command -v jq >/dev/null 2>&1; then
  printf '\n-- dependency closure --\n'
  EXTERN="$(jq -r '
    (.packages | map(.pkgname)) as $known
    | [ .packages[]
        | .pkgname as $p
        | (.depends // [])[]
        | select(. as $d | ($known | index($d)) | not)
        | $p + " -> " + . ]
    | unique | .[]' "$MANIFEST" 2>/dev/null || true)"
  if [[ -z "$EXTERN" ]]; then
    ok "all depends resolve within the manifest"
  else
    while IFS= read -r e; do
      [[ -n "$e" ]] && warn "external dependency: $e"
    done <<<"$EXTERN"
  fi
fi

printf '\n-- summary: %d error(s), %d warning(s) --\n' "$ERRORS" "$WARNS"
[[ $ERRORS -eq 0 ]] || exit 1
exit 0

#!/usr/bin/env bash
# bootstrap.sh — stand up a clean Arch rootfs and install the entire
# arch-repackage output into it in a single transaction.
#
# This is the integration entry point for the test harness. It does not test
# packages one by one; it builds the whole set, then installs the whole set
# at once with `pacman -U`, exercising the meta-package tree and the
# dependency closure as a unit.
#
# Pipeline:
#   1. obtain a pristine base rootfs (pacstrap, or the official bootstrap
#      tarball when pacstrap is unavailable),
#   2. run the arch-repackage pipeline against a target (default: the live
#      host) to produce a build tree,
#   3. makepkg every PKGBUILD into a .pkg.tar.zst,
#   4. pacman -U the whole set into the rootfs in one go,
#   5. leave the populated rootfs for the test scripts.
#
# Everything is capability-probed: missing pacstrap, makepkg or root downgrade
# steps to a skip rather than a hard failure.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/lib.sh
. "$HERE/lib.sh"
harness_paths

# --- defaults -------------------------------------------------------------
TARGET_ROOT="/"                       # what to reverse; default = live host
OS_NAME="hostrepack"
ARCH="$(uname -m)"
OUT=""                                # build-tree output dir (default: WORK)
ROOTFS=""                             # base rootfs dir (default: WORK/rootfs)
KEEP_ROOTFS=0
MIRROR="https://geo.mirror.pkgbuild.com"
BOOTSTRAP_BASE="https://geo.mirror.pkgbuild.com/iso/latest"

usage() {
  cat >&2 <<'EOF'
Usage: bootstrap.sh [options]

  --target <DIR>     Root to reverse-engineer (default: "/", the live host)
  --os-name <NAME>   Slug for synthetic packages (default: hostrepack)
  --arch <ARCH>      Target architecture (default: uname -m)
  --out <DIR>        Build-tree output directory (default: workspace)
  --rootfs <DIR>     Base rootfs directory (default: workspace/rootfs)
  --keep-rootfs      Do not delete the populated rootfs on exit
  --mirror <URL>     Pacman mirror for pacstrap (default: pkgbuild.com geo)

Produces a populated rootfs and prints its path as the final line:
  ROOTFS=<path>
so test scripts can consume it.
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)      TARGET_ROOT="${2:-}";  shift 2 ;;
    --os-name)     OS_NAME="${2:-}";      shift 2 ;;
    --arch)        ARCH="${2:-}";         shift 2 ;;
    --out)         OUT="${2:-}";          shift 2 ;;
    --rootfs)      ROOTFS="${2:-}";       shift 2 ;;
    --keep-rootfs) KEEP_ROOTFS=1;         shift   ;;
    --mirror)      MIRROR="${2:-}";       shift 2 ;;
    -h|--help)     usage ;;
    *)             die "unknown argument: $1" ;;
  esac
done

harness_init bootstrap
[[ -n "$OUT"    ]] || OUT="$WORK/build"
[[ -n "$ROOTFS" ]] || ROOTFS="$WORK/rootfs"
[[ "$KEEP_ROOTFS" == "1" ]] && KEEP_WORK=1

# =========================================================================
# Step 1 — base rootfs
# =========================================================================
make_base_rootfs() {
  mkdir -p "$ROOTFS"

  if cap_pacstrap && cap_root; then
    log "creating base rootfs with pacstrap"
    # -K = fresh keyring, -c = use host package cache, base only.
    if pacstrap -K -c "$ROOTFS" base 2>"$WORK/pacstrap.log"; then
      ok "base rootfs via pacstrap"
      return 0
    fi
    fail "pacstrap failed (see $WORK/pacstrap.log)"
    return 1
  fi

  # Fallback: the official bootstrap tarball. Needs root to unpack faithfully
  # (device nodes, ownership) but works without pacstrap installed.
  if ! command -v curl >/dev/null 2>&1; then
    skip "no pacstrap and no curl; cannot build a base rootfs"
    return 1
  fi
  log "pacstrap unavailable; fetching official bootstrap tarball"
  local tb="$WORK/bootstrap.tar.zst"
  local url="$BOOTSTRAP_BASE/archlinux-bootstrap-${ARCH}.tar.zst"
  if ! curl -fsSL -o "$tb" "$url" 2>"$WORK/curl.log"; then
    skip "could not download bootstrap tarball from $url"
    return 1
  fi
  if ! cap_bsdtar; then
    skip "bsdtar unavailable; cannot unpack bootstrap tarball"
    return 1
  fi
  # The tarball wraps everything in root.<arch>/ — strip that component.
  bsdtar -x -f "$tb" -C "$ROOTFS" --strip-components=1 2>"$WORK/untar.log" \
    || { fail "bootstrap tarball did not unpack"; return 1; }
  printf 'Server = %s/$repo/os/$arch\n' "$MIRROR" \
    >"$ROOTFS/etc/pacman.d/mirrorlist"
  ok "base rootfs via bootstrap tarball"
}

# =========================================================================
# Step 2 — run the arch-repackage pipeline against the target
# =========================================================================
run_repackage_pipeline() {
  local inv="$WORK/inventory.tsv"
  local attr="$WORK/attribution.tsv"
  local meta="$WORK/meta.tsv"
  local manifest="$WORK/manifest.json"

  log "reversing target: $TARGET_ROOT"
  run_phase inventory.sh -- --root "$TARGET_ROOT" >"$inv" \
    || { fail "inventory phase failed"; return 1; }
  ok "inventory: $(($(wc -l <"$inv") - 1)) objects"

  run_phase attribute.sh -- --root "$TARGET_ROOT" --inventory "$inv" \
    --meta-out "$meta" >"$attr" \
    || { fail "attribute phase failed"; return 1; }
  ok "attribution complete"

  if ! command -v jq >/dev/null 2>&1; then
    skip "jq unavailable; cannot run plan/emit phases"
    return 1
  fi
  run_phase plan.sh -- --attribution "$attr" --meta "$meta" \
    --os-name "$OS_NAME" --arch "$ARCH" >"$manifest" \
    || { fail "plan phase failed"; return 1; }
  ok "manifest: $(jq '.packages|length' "$manifest") packages"

  run_phase emit.sh -- --manifest "$manifest" --root "$TARGET_ROOT" \
    --out "$OUT" \
    || { fail "emit phase failed"; return 1; }
  ok "build tree emitted to $OUT"
  export MANIFEST="$manifest"
}

# =========================================================================
# Step 3 — makepkg every package
# =========================================================================
build_all_packages() {
  if ! cap_makepkg; then
    skip "makepkg unavailable; cannot build packages (build tree is at $OUT)"
    return 1
  fi
  local built=0 failed=0 d
  shopt -s nullglob
  for d in "$OUT"/packages/*/; do
    [[ -f "$d/PKGBUILD" ]] || continue
    # --nodeps: the meta-tree closure is validated separately; here we only
    # want each PKGBUILD to produce its artifact. -f to overwrite, -c clean.
    if ( cd "$d" && makepkg --nodeps --clean --force \
           >"$WORK/makepkg.$(basename "$d").log" 2>&1 ); then
      built=$((built+1))
    else
      failed=$((failed+1))
      fail "makepkg failed for $(basename "$d") (see $WORK/makepkg.*.log)"
    fi
  done
  if [[ $failed -eq 0 && $built -gt 0 ]]; then
    ok "built $built package(s)"
    return 0
  fi
  [[ $built -gt 0 ]] && log "built $built, failed $failed"
  return 1
}

# =========================================================================
# Step 4 — install the whole set in ONE pacman transaction
# =========================================================================
install_all_packages() {
  if ! cap_pacman || ! cap_root; then
    skip "pacman+root required to install into the rootfs"
    return 1
  fi
  shopt -s nullglob
  local pkgs=( "$OUT"/packages/*/*.pkg.tar.zst )
  if [[ ${#pkgs[@]} -eq 0 ]]; then
    skip "no built packages to install"
    return 1
  fi
  log "installing ${#pkgs[@]} package(s) into $ROOTFS in one transaction"
  # One `pacman -U` for the entire set: this is the whole point — the meta
  # packages and their leaf dependencies must resolve together. --sysroot
  # targets the rootfs; --noconfirm for non-interactive use.
  if pacman --sysroot "$ROOTFS" -U --noconfirm "${pkgs[@]}" \
       >"$WORK/pacman-U.log" 2>&1; then
    ok "installed entire package set in a single transaction"
    return 0
  fi
  fail "collective pacman -U failed (see $WORK/pacman-U.log)"
  return 1
}

# =========================================================================
# main
# =========================================================================
main() {
  make_base_rootfs        || { harness_summary; exit 1; }
  run_repackage_pipeline  || { harness_summary; exit 1; }
  build_all_packages      || log "continuing without an install step"
  install_all_packages    || log "rootfs left at base state"

  harness_summary || true
  # Final line is the contract with the test scripts.
  printf 'ROOTFS=%s\n' "$ROOTFS"
}

main

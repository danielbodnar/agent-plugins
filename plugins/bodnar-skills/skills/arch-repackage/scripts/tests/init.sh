#!/usr/bin/env bash
# tests/init.sh — orchestrator for the arch-repackage test harness.
#
# Runs the full integration flow: bootstrap a rootfs and install the entire
# emitted package set into it (bootstrap.sh), then hand that populated rootfs
# to the runtime test scripts (nspawn, vmspawn, mstack) in turn.
#
# This is the single entry point a user should invoke:
#   scripts/tests/init.sh --target / --os-name myhost
#
# Each downstream test degrades to a skip when its capability (nspawn nesting,
# KVM, mount privileges) is unavailable, so this runs end to end on a CI box
# and on a full Arch workstation alike, doing as much as the host allows.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/lib.sh
. "$HERE/lib.sh"
harness_paths
harness_init init

# --- args: forwarded verbatim to bootstrap.sh -----------------------------
ROOTFS_KEEP="$WORK/rootfs"
BOOTSTRAP_ARGS=( --rootfs "$ROOTFS_KEEP" --keep-rootfs )
SELECTED=()        # which runtime suites to run; empty = all

usage() {
  cat >&2 <<'EOF'
Usage: tests/init.sh [bootstrap options] [-- suite...]

Bootstrap options are passed straight through to bootstrap.sh:
  --target <DIR>   --os-name <NAME>   --arch <ARCH>
  --out <DIR>      --mirror <URL>

After `--`, name one or more suites to run (default: all):
  nspawn   vmspawn   mstack

Example:
  tests/init.sh --target / --os-name myhost -- nspawn mstack
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --) shift; SELECTED=( "$@" ); break ;;
    -h|--help) usage ;;
    *)  BOOTSTRAP_ARGS+=( "$1" ); shift ;;
  esac
done
[[ ${#SELECTED[@]} -gt 0 ]] || SELECTED=( nspawn vmspawn mstack )

# =========================================================================
# Step 1 — bootstrap + install the whole package set
# =========================================================================
# bootstrap.sh prints only `ROOTFS=<path>` on stdout; all its progress
# chatter is on stderr. Capture stdout to a file, let stderr through live.
log "running bootstrap.sh"
BOOT_OUT="$WORK/bootstrap.stdout"
if bash "$HERE/bootstrap.sh" "${BOOTSTRAP_ARGS[@]}" >"$BOOT_OUT"; then
  ok "bootstrap.sh completed"
else
  fail "bootstrap.sh reported failures"
fi

# The contract: bootstrap.sh prints `ROOTFS=<path>` as its final stdout line.
ROOTFS="$(awk -F= '/^ROOTFS=/{v=$2} END{print v}' "$BOOT_OUT")"
if [[ -z "$ROOTFS" || ! -d "$ROOTFS" ]]; then
  fail "bootstrap.sh did not yield a usable rootfs"
  harness_summary || true
  exit 1
fi
ok "populated rootfs: $ROOTFS"
export ROOTFS

# =========================================================================
# Step 2 — dispatch runtime suites
# =========================================================================
run_suite() {
  local suite="$1"
  local script="$HERE/$suite.sh"
  if [[ ! -x "$script" && ! -f "$script" ]]; then
    skip "no such suite: $suite"
    return
  fi
  log "── suite: $suite ──"
  if bash "$script" --rootfs "$ROOTFS"; then
    ok "suite $suite passed"
  else
    fail "suite $suite reported failures"
  fi
}

for s in "${SELECTED[@]}"; do
  run_suite "$s"
done

harness_summary

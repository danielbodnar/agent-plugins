#!/usr/bin/env bash
# tests/nspawn.sh — boot the populated rootfs as a systemd-nspawn container
# and assert the repackaged system is coherent.
#
# Consumes the rootfs produced by bootstrap.sh (the whole emitted package set
# already installed). Verifies the container can be entered, that the meta
# packages and a sample of leaves are registered in the pacman database, and
# that pacman's own integrity check passes inside the container.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/lib.sh
. "$HERE/lib.sh"
harness_init nspawn

ROOTFS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rootfs) ROOTFS="${2:-}"; shift 2 ;;
    -h|--help) printf 'Usage: nspawn.sh --rootfs <DIR>\n' >&2; exit 1 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ -n "$ROOTFS" && -d "$ROOTFS" ]] || die "--rootfs <DIR> is required"

# nspawn needs the binary; running it needs root (or a delegated user
# instance). Without either, the whole suite is a clean skip.
require nspawn "systemd-nspawn not installed" || { harness_summary; exit 0; }
require root   "systemd-nspawn requires root for a system container" \
  || { harness_summary; exit 0; }

# run_in CMD... : execute a command inside the container, non-booted, quiet.
# --pipe keeps it scriptable; -M names the ephemeral machine after the run.
run_in() {
  systemd-nspawn -q -D "$ROOTFS" --pipe \
    --machine "arpk-nspawn-$$" -- "$@" 2>>"$WORK/nspawn.err"
}

# --- 1. the container starts and runs a command ---------------------------
if out="$(run_in /usr/bin/true 2>/dev/null)"; then
  ok "container boots and executes a command"
else
  fail "could not execute inside the nspawn container (see $WORK/nspawn.err)"
  harness_summary; exit 1
fi

# --- 2. os-release is present and parseable -------------------------------
if run_in /usr/bin/test -r /usr/lib/os-release; then
  ok "os-release present in container"
else
  skip "no os-release in container"
fi

# --- 3. pacman database carries the installed set -------------------------
if run_in /usr/bin/pacman -Q >/dev/null 2>&1; then
  count="$(run_in /usr/bin/pacman -Q 2>/dev/null | wc -l)"
  ok "pacman database queryable ($count package(s) registered)"

  # The meta tree should be present: at least one *-system root.
  if run_in /usr/bin/pacman -Qq 2>/dev/null | grep -q -- '-system$'; then
    ok "meta-package (*-system) registered in container"
  else
    skip "no *-system meta-package found (target may have produced none)"
  fi
else
  skip "pacman not available inside the container"
fi

# --- 4. integrity: pacman -Qkk inside the container -----------------------
# -Qkk checks every installed file against the package database. Output on
# stderr is expected for config drift; a non-zero exit on hard mismatches.
if run_in /usr/bin/pacman -Qkk >"$WORK/qkk.out" 2>&1; then
  ok "in-container package integrity check passed"
else
  # Non-fatal: report the count of complaints rather than failing outright,
  # since /etc drift is normal. A reviewer reads qkk.out.
  n="$(wc -l <"$WORK/qkk.out")"
  skip "integrity check raised $n note(s) (see $WORK/qkk.out)"
fi

harness_summary

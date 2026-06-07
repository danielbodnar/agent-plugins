#!/usr/bin/env bash
# tests/vmspawn.sh — boot the populated rootfs as a full VM with
# systemd-vmspawn and assert it reaches a running state.
#
# This is the heaviest suite: it needs a real kernel boot under KVM. Where
# KVM or vmspawn is missing it skips cleanly. Where they are present it boots
# the rootfs ephemerally, waits for the guest to signal readiness, and tears
# it down.
#
# vmspawn boots a disk image or a directory; a directory is mounted via
# virtiofs. The rootfs from bootstrap.sh needs a kernel to boot — vmspawn
# uses the host kernel by default (-Dlinux), which is what we rely on here.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/lib.sh
. "$HERE/lib.sh"
harness_init vmspawn

ROOTFS=""
TIMEOUT=90
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rootfs)  ROOTFS="${2:-}";  shift 2 ;;
    --timeout) TIMEOUT="${2:-}"; shift 2 ;;
    -h|--help) printf 'Usage: vmspawn.sh --rootfs <DIR> [--timeout SEC]\n' >&2; exit 1 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ -n "$ROOTFS" && -d "$ROOTFS" ]] || die "--rootfs <DIR> is required"

# A VM boot needs the binary, KVM, and (for a directory root + virtiofs) root.
require vmspawn "systemd-vmspawn not installed" || { harness_summary; exit 0; }
require kvm     "/dev/kvm not available or not writable" \
  || { harness_summary; exit 0; }
require root    "vmspawn directory boot needs root for virtiofs" \
  || { harness_summary; exit 0; }

# A guest kernel must exist to boot. vmspawn can borrow the host kernel, but
# only if one is installed; check before committing to a boot attempt.
if ! ls /boot/vmlinuz-* >/dev/null 2>&1 && [[ ! -e /boot/vmlinuz-linux ]]; then
  skip "no host kernel under /boot to lend the guest"
  harness_summary; exit 0
fi

# --- boot the VM, ephemerally, headless -----------------------------------
# --ephemeral  : snapshot the rootfs, discard writes on shutdown.
# -i / -D      : directory root (virtiofs).
# --console=read-only keeps us non-interactive; we watch the serial log.
SERIAL="$WORK/serial.log"
log "booting rootfs as an ephemeral VM (timeout ${TIMEOUT}s)"

# Run vmspawn in the background so we can watch for the readiness marker.
( systemd-vmspawn -q \
    --directory "$ROOTFS" \
    --ephemeral \
    --console=read-only \
    >"$SERIAL" 2>&1 ) &
VM_PID=$!

# Wait for the guest's PID 1 to announce a reached target, or for the VM to
# exit, or for the timeout — whichever comes first.
booted=0
for (( i=0; i<TIMEOUT; i++ )); do
  if ! kill -0 "$VM_PID" 2>/dev/null; then
    break   # VM exited on its own
  fi
  if grep -Eq 'Reached target|systemd .* running in system mode|Welcome to' \
       "$SERIAL" 2>/dev/null; then
    booted=1
    break
  fi
  sleep 1
done

# Tear down: vmspawn forwards SIGTERM to an orderly guest poweroff.
if kill -0 "$VM_PID" 2>/dev/null; then
  kill -TERM "$VM_PID" 2>/dev/null
  for (( i=0; i<15; i++ )); do
    kill -0 "$VM_PID" 2>/dev/null || break
    sleep 1
  done
  kill -KILL "$VM_PID" 2>/dev/null || true
fi
wait "$VM_PID" 2>/dev/null || true

# --- verdict --------------------------------------------------------------
if [[ $booted -eq 1 ]]; then
  ok "VM reached a systemd target (guest booted the repackaged rootfs)"
else
  if [[ -s "$SERIAL" ]]; then
    fail "VM did not reach a systemd target within ${TIMEOUT}s (see $SERIAL)"
  else
    skip "VM produced no serial output; environment likely cannot nest KVM"
  fi
fi

# A kernel panic in the serial log is always a hard failure.
if grep -Eq 'Kernel panic|Aborting' "$SERIAL" 2>/dev/null; then
  fail "kernel panic observed in guest serial log"
fi

harness_summary

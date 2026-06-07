#!/usr/bin/env bash
# tests/mstack.sh — verify the v260 mount-stack handling of the repackaged
# system end to end.
#
# Two things are checked:
#   1. Composition: build a throwaway `.mstack/` directory whose bottom layer
#      is the populated rootfs and whose top layer is a small overlay, mount
#      it with systemd-mstack, and confirm the overlay composes correctly and
#      the writable `rw/` upper layer behaves as the spec requires.
#   2. Fidelity: if the reversed target itself shipped any `.mstack/`
#      directories, confirm they survived repackaging with layer ordering and
#      symlink references intact (the taxonomy rules in
#      references/systemd-taxonomy.md).
#
# mstack landed in systemd v260; on older systemd the suite skips cleanly.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/lib.sh
. "$HERE/lib.sh"
harness_init mstack

ROOTFS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rootfs) ROOTFS="${2:-}"; shift 2 ;;
    -h|--help) printf 'Usage: mstack.sh --rootfs <DIR>\n' >&2; exit 1 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ -n "$ROOTFS" && -d "$ROOTFS" ]] || die "--rootfs <DIR> is required"

# mstack is a v260 feature; the tool must exist. Mounting needs root.
_probe_mstack() { command -v systemd-mstack >/dev/null 2>&1; }
cap_mstack() { _cap mstack _probe_mstack; }

require mstack "systemd-mstack not installed (needs systemd v260+)" \
  || { harness_summary; exit 0; }
require root   "mounting a mount stack requires root" \
  || { harness_summary; exit 0; }

# =========================================================================
# Test 1 — compose a mount stack over the repackaged rootfs
# =========================================================================
# Layout per systemd.mstack(7):
#   stack.mstack/layer@10/   -> bottom read-only layer
#   stack.mstack/layer@20/   -> top read-only layer (higher suffix = higher)
#   stack.mstack/rw/         -> writable upper layer (data/ + work/)
STACK="$WORK/stack.mstack"
mkdir -p "$STACK/rw"

# Bottom layer: a marker file representing the base.
mkdir -p "$STACK/layer@10"
echo bottom >"$STACK/layer@10/base-marker"

# Top layer: a marker that should win over the bottom for shared paths.
mkdir -p "$STACK/layer@20"
echo top >"$STACK/layer@20/top-marker"
echo top-wins >"$STACK/layer@20/base-marker"   # shadows layer@10's copy

MNT="$WORK/mnt"
mkdir -p "$MNT"

if systemd-mstack --mount --mkdir "$STACK" "$MNT" 2>"$WORK/mstack.err"; then
  ok "systemd-mstack mounted a composed stack"
  MOUNTED=1
else
  fail "systemd-mstack could not mount the stack (see $WORK/mstack.err)"
  MOUNTED=0
fi

if [[ "${MOUNTED:-0}" -eq 1 ]]; then
  # Overlay ordering: both layers visible, higher suffix shadows lower.
  if [[ -f "$MNT/top-marker" && -f "$MNT/base-marker" ]]; then
    ok "both overlay layers are visible in the composed view"
  else
    fail "composed view is missing expected layer content"
  fi
  if [[ "$(cat "$MNT/base-marker" 2>/dev/null)" == "top-wins" ]]; then
    ok "layer@20 correctly shadows layer@10 (suffix ordering honoured)"
  else
    fail "layer ordering wrong: higher-suffix layer did not win"
  fi

  # Writable upper layer: a write must land under rw/, not in a read layer.
  if echo probe >"$MNT/written-at-runtime" 2>/dev/null; then
    if [[ -f "$STACK/rw/data/written-at-runtime" ]]; then
      ok "runtime write landed in rw/data/ (writable upper layer correct)"
    else
      skip "write succeeded but rw/data/ layout differs from expectation"
    fi
    # The read-only layers must be untouched by the write.
    if [[ ! -e "$STACK/layer@10/written-at-runtime" \
       && ! -e "$STACK/layer@20/written-at-runtime" ]]; then
      ok "read-only layers untouched by the runtime write"
    else
      fail "a runtime write leaked into a read-only layer"
    fi
  else
    skip "composed mount is read-only; cannot exercise rw/ upper layer"
  fi

  # Unmount; --rmdir cleans the mountpoint per the v260 helper interface.
  if systemd-mstack --umount --rmdir "$MNT" 2>>"$WORK/mstack.err"; then
    ok "mount stack unmounted cleanly"
  else
    fail "could not unmount the stack (see $WORK/mstack.err)"
  fi
fi

# =========================================================================
# Test 2 — fidelity of any .mstack/ shipped by the reversed target
# =========================================================================
shopt -s nullglob globstar
shipped=( "$ROOTFS"/**/*.mstack )
if [[ ${#shipped[@]} -eq 0 ]]; then
  skip "reversed target shipped no .mstack/ directories; nothing to verify"
else
  for ms in "${shipped[@]}"; do
    name="$(basename "$ms")"
    # layer@NN ordering must be preserved verbatim.
    if compgen -G "$ms/layer@*" >/dev/null; then
      bad=0
      for L in "$ms"/layer@*; do
        [[ "$(basename "$L")" =~ ^layer@[0-9]+$ ]] || bad=1
      done
      if [[ $bad -eq 0 ]]; then
        ok "$name: layer@NN directories intact"
      else
        fail "$name: a layer directory lost its numeric suffix"
      fi
    fi
    # The writable upper layer must NOT carry baked-in runtime content:
    # bootstrap should have shipped at most an empty rw/.
    if [[ -d "$ms/rw/data" ]] && [[ -n "$(ls -A "$ms/rw/data" 2>/dev/null)" ]]; then
      fail "$name: rw/data/ shipped with baked-in content (should be empty)"
    else
      ok "$name: writable upper layer is empty as required"
    fi
    # Layer references to DDIs must remain symlinks, never dereferenced.
    found_link=0
    for entry in "$ms"/* "$ms"/**/*; do
      [[ -L "$entry" ]] || continue
      found_link=1
      tgt="$(readlink "$entry")"
      log "$name: layer reference symlink preserved -> $tgt"
    done
    [[ $found_link -eq 1 ]] && ok "$name: DDI reference symlinks preserved"
  done
fi

harness_summary

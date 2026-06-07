#!/usr/bin/env bash
# lib.sh — shared helpers for the arch-repackage test harness.
#
# Sourced, never executed. Provides capability probing, logging, a per-run
# workspace, and a uniform skip/pass/fail accounting model so every test
# script degrades gracefully on a host that lacks KVM, nspawn nesting, or
# root, instead of hard-failing.
#
# A test script's only contract: source this file, call harness_init, run
# checks via the ok/skip/fail helpers, and end with harness_summary.

# --- guard: must be sourced -----------------------------------------------
(return 0 2>/dev/null) || {
  printf 'lib.sh: this file must be sourced, not executed\n' >&2
  exit 2
}

set -uo pipefail

# --- accounting -----------------------------------------------------------
HARNESS_PASS=0
HARNESS_FAIL=0
HARNESS_SKIP=0
HARNESS_NAME="${HARNESS_NAME:-test}"

_c() { # colour only on a tty
  if [[ -t 2 ]]; then printf '\033[%sm%s\033[0m' "$1" "$2"; else printf '%s' "$2"; fi
}
# All harness chatter goes to stderr. stdout is reserved for data a test
# script may want to capture (e.g. a pipeline phase redirected to a file).
log()  { printf '%s %s\n' "$(_c '1;34' "[$HARNESS_NAME]")" "$*" >&2; }
ok()   { HARNESS_PASS=$((HARNESS_PASS+1)); printf '%s %s\n' "$(_c '1;32' 'PASS')" "$*" >&2; }
fail() { HARNESS_FAIL=$((HARNESS_FAIL+1)); printf '%s %s\n' "$(_c '1;31' 'FAIL')" "$*" >&2; }
skip() { HARNESS_SKIP=$((HARNESS_SKIP+1)); printf '%s %s\n' "$(_c '1;33' 'SKIP')" "$*" >&2; }
die()  { printf '%s %s\n' "$(_c '1;31' 'ERROR')" "$*" >&2; exit 2; }

# --- workspace ------------------------------------------------------------
# A per-run scratch dir under TMPDIR; removed on exit unless KEEP_WORK=1.
harness_init() {
  HARNESS_NAME="${1:-$HARNESS_NAME}"
  WORK="$(mktemp -d "${TMPDIR:-/tmp}/arch-repackage-${HARNESS_NAME}.XXXXXX")"
  export WORK
  if [[ "${KEEP_WORK:-0}" == "1" ]]; then
    trap 'log "workspace kept at $WORK"' EXIT
  else
    trap 'rm -rf "$WORK"' EXIT
  fi
  log "workspace: $WORK"
}

harness_summary() {
  printf '\n%s %d passed, %d failed, %d skipped\n' \
    "$(_c '1;34' "[$HARNESS_NAME]")" \
    "$HARNESS_PASS" "$HARNESS_FAIL" "$HARNESS_SKIP" >&2
  [[ $HARNESS_FAIL -eq 0 ]] || return 1
  return 0
}

# --- capability probing ---------------------------------------------------
# Each cap_* returns 0 when the capability is usable. Results are cached.
declare -A _CAP_CACHE=()
_cap() {
  local key="$1" fn="$2"
  if [[ -z "${_CAP_CACHE[$key]:-}" ]]; then
    if "$fn"; then _CAP_CACHE[$key]=yes; else _CAP_CACHE[$key]=no; fi
  fi
  [[ "${_CAP_CACHE[$key]}" == "yes" ]]
}

_probe_root()     { [[ "$(id -u)" -eq 0 ]]; }
_probe_kvm()      { [[ -c /dev/kvm && -w /dev/kvm ]]; }
_probe_pacstrap() { command -v pacstrap   >/dev/null 2>&1; }
_probe_nspawn()   { command -v systemd-nspawn >/dev/null 2>&1; }
_probe_vmspawn()  { command -v systemd-vmspawn >/dev/null 2>&1; }
_probe_makepkg()  { command -v makepkg    >/dev/null 2>&1; }
_probe_pacman()   { command -v pacman     >/dev/null 2>&1; }
_probe_bsdtar()   { command -v bsdtar     >/dev/null 2>&1; }
_probe_userns()   { # unprivileged user namespaces (needed for rootless nspawn)
  local f=/proc/sys/kernel/unprivileged_userns_clone
  [[ ! -e "$f" ]] || [[ "$(cat "$f" 2>/dev/null)" == "1" ]]
}

cap_root()     { _cap root     _probe_root;     }
cap_kvm()      { _cap kvm      _probe_kvm;      }
cap_pacstrap() { _cap pacstrap _probe_pacstrap; }
cap_nspawn()   { _cap nspawn   _probe_nspawn;   }
cap_vmspawn()  { _cap vmspawn  _probe_vmspawn;  }
cap_makepkg()  { _cap makepkg  _probe_makepkg;  }
cap_pacman()   { _cap pacman   _probe_pacman;   }
cap_bsdtar()   { _cap bsdtar   _probe_bsdtar;   }
cap_userns()   { _cap userns   _probe_userns;   }

# require CAP MESSAGE... — skip the calling test cleanly when CAP is absent.
# Returns non-zero so the caller can `require x || return 0`.
require() {
  local cap="$1"; shift
  if "cap_$cap"; then return 0; fi
  skip "${*:-requires $cap}"
  return 1
}

# --- skill paths ----------------------------------------------------------
# Resolve the scripts/ directory from lib.sh's own location, which is fixed
# at scripts/tests/lib.sh regardless of which script sourced it.
harness_paths() {
  local libdir
  libdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"  # scripts/tests/
  SCRIPTS_DIR="$(cd "$libdir/.." && pwd)"                 # scripts/
  SKILL_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"              # skill root
  export SCRIPTS_DIR SKILL_DIR
}

# run_phase NAME -- ARGS... : invoke a pipeline script, tee output, set RC.
run_phase() {
  local name="$1"; shift
  [[ "$1" == "--" ]] && shift
  log "phase: $name $*"
  bash "$SCRIPTS_DIR/$name" "$@"
}

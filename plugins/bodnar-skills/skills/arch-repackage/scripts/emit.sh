#!/usr/bin/env bash
# emit.sh — Phase 5 of arch-repackage.
# Turn a repackage-manifest.json into a tree of build directories: one
# directory per package, each containing a PKGBUILD (and, for binary leaves, a
# staged .tar.zst payload, and an optional .install scriptlet).
#
# Binary leaves repackage the installed bytes verbatim: the payload tarball is
# cut straight from the target root with bsdtar, preserving mode/owner/mtime/
# xattrs/capabilities. No attempt is made to rebuild from source.
#
# Requires jq and bsdtar (libarchive). Uses makepkg for .SRCINFO when present.
set -euo pipefail

MANIFEST=""
ROOT=""
OUT=""

die()  { printf 'emit.sh: %s\n' "$*" >&2; exit 1; }
warn() { printf 'emit.sh: %s\n' "$*" >&2; }
usage() {
  cat >&2 <<'EOF'
Usage: emit.sh --manifest <JSON> --root <DIR> --out <DIR>

  --manifest  repackage-manifest.json from plan.sh (hand-refined)
  --root      Target root directory (payload source for binary leaves)
  --out       Output directory for the package build tree

Writes <out>/packages/<pkgname>/ for every manifest entry.
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --manifest) MANIFEST="${2:-}"; shift 2 ;;
    --root)     ROOT="${2:-}";     shift 2 ;;
    --out)      OUT="${2:-}";      shift 2 ;;
    -h|--help)  usage ;;
    *)          die "unknown argument: $1" ;;
  esac
done
[[ -n "$MANIFEST" && -n "$ROOT" && -n "$OUT" ]] || usage
[[ -f "$MANIFEST" ]] || die "manifest not found: $MANIFEST"
[[ -d "$ROOT"     ]] || die "root is not a directory: $ROOT"
command -v jq      >/dev/null 2>&1 || die "jq is required"
command -v bsdtar  >/dev/null 2>&1 || die "bsdtar (libarchive) is required"
[[ "$ROOT" != "/" ]] && ROOT="${ROOT%/}"

# Asset protos live one directory up from this script.
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$SELF/../assets"
for p in PKGBUILD.meta.proto PKGBUILD.binary-repackage.proto \
         PKGBUILD.source-rebuild.proto proto.install; do
  [[ -f "$ASSETS/$p" ]] || die "missing asset proto: $p"
done

mkdir -p "$OUT/packages"
PKGROOT="$OUT/packages"

# subst FILE KEY VALUE ...  -> proto with %KEY% placeholders expanded on stdout
subst() {
  local file="$1"; shift
  local content; content="$(cat "$file")"
  while [[ $# -gt 0 ]]; do
    local key="$1" val="$2"; shift 2
    content="${content//"%$key%"/$val}"
  done
  printf '%s\n' "$content"
}

# JSON-array -> comma+space joined bash string
join_field() { jq -r "$1 | join(\" \")" <<<"$2"; }

COUNT="$(jq '.packages | length' "$MANIFEST")"
warn "emitting $COUNT package(s) to $PKGROOT"

for i in $(seq 0 $((COUNT - 1))); do
  ENTRY="$(jq -c ".packages[$i]" "$MANIFEST")"
  PKGNAME="$(jq -r '.pkgname' <<<"$ENTRY")"
  KIND="$(jq -r '.kind' <<<"$ENTRY")"
  STRAT="$(jq -r '.strategy' <<<"$ENTRY")"
  PKGVER="$(jq -r '.pkgver // "1.0.0"' <<<"$ENTRY")"
  PKGREL="$(jq -r '.pkgrel // "1"' <<<"$ENTRY")"
  EPOCHN="$(jq -r '.epoch // 0' <<<"$ENTRY")"
  PKGDESC="$(jq -r '.pkgdesc // ""' <<<"$ENTRY")"
  URL="$(jq -r '.url // ""' <<<"$ENTRY")"
  ARCH="$(join_field '.arch // ["any"]' "$ENTRY")"
  LICENSE="$(jq -r --arg q "'" '(.license // ["custom:unknown"]) | map($q+.+$q) | join(" ")' <<<"$ENTRY")"
  DEPENDS="$(jq -r --arg q "'" '(.depends // []) | map($q+.+$q) | join(" ")' <<<"$ENTRY")"

  PDIR="$PKGROOT/$PKGNAME"
  mkdir -p "$PDIR"

  EPOCH_LINE=""
  [[ "$EPOCHN" != "0" && -n "$EPOCHN" ]] && EPOCH_LINE="epoch=$EPOCHN"

  case "$STRAT" in
  meta)
    subst "$ASSETS/PKGBUILD.meta.proto" \
      PKGNAME "$PKGNAME" PKGVER "$PKGVER" PKGREL "$PKGREL" \
      PKGDESC "$PKGDESC" URL "$URL" LICENSE "$LICENSE" \
      DEPENDS "$DEPENDS" >"$PDIR/PKGBUILD"
    ;;
  binary)
    # Stage the payload: cut listed paths verbatim from the target root.
    # --no-recursion means each listed path is archived exactly once and
    # directories are not walked, so a listed dir is staged as an empty dir.
    # Symlinks are archived as symlinks, never dereferenced: an `.mstack/`
    # layer reference pointing at a DDI stays a symlink, and the writable
    # `rw/` of a mount stack can be staged empty by listing `rw/` itself.
    LIST="$(mktemp)"
    jq -r '.files[]?' <<<"$ENTRY" | sed 's:^/::' >"$LIST"
    PAYLOAD="${PKGNAME}-${PKGVER}.payload.tar.zst"
    if [[ -s "$LIST" ]]; then
      ( cd "$ROOT" && LC_ALL=C bsdtar --no-recursion \
          --uid 0 --gid 0 \
          -c -T "$LIST" --zstd -f "$PDIR/$PAYLOAD" )
    else
      warn "$PKGNAME: no files; emitting empty payload"
      : >"$PDIR/.keep"
      ( cd "$PDIR" && LC_ALL=C bsdtar -c --zstd -f "$PAYLOAD" .keep )
    fi
    rm -f "$LIST"

    if command -v b2sum >/dev/null 2>&1; then
      B2="$(b2sum "$PDIR/$PAYLOAD" | awk '{print $1}')"
    else
      B2="SKIP"
      warn "$PKGNAME: b2sum unavailable; b2sums set to SKIP"
    fi

    # Optional install scriptlet.
    INSTALL_LINE=""
    if [[ "$(jq -r '.scriptlet.needed // false' <<<"$ENTRY")" == "true" ]]; then
      INSTALL_FILE="${PKGNAME}.install"
      INSTALL_LINE="install=$INSTALL_FILE"
      subst "$ASSETS/proto.install" \
        POST_INSTALL "$(jq -r '.scriptlet.post_install // "  :"' <<<"$ENTRY")" \
        POST_UPGRADE "$(jq -r '.scriptlet.post_upgrade // "  :"' <<<"$ENTRY")" \
        POST_REMOVE  "$(jq -r '.scriptlet.post_remove  // "  :"' <<<"$ENTRY")" \
        >"$PDIR/$INSTALL_FILE"
    fi

    ORIGIN="$(jq -r 'if .origin then (.origin.native_distro+":"+.origin.native_pkg) else "synthetic" end' <<<"$ENTRY")"

    subst "$ASSETS/PKGBUILD.binary-repackage.proto" \
      PKGNAME "$PKGNAME" PKGVER "$PKGVER" PKGREL "$PKGREL" \
      EPOCH "$EPOCH_LINE" PKGDESC "$PKGDESC" URL "$URL" ARCH "$ARCH" \
      LICENSE "$LICENSE" DEPENDS "$DEPENDS" ORIGIN "$ORIGIN" \
      PAYLOAD "$PAYLOAD" B2SUM "$B2" INSTALL "$INSTALL_LINE" \
      >"$PDIR/PKGBUILD"
    ;;
  source)
    subst "$ASSETS/PKGBUILD.source-rebuild.proto" \
      PKGNAME "$PKGNAME" PKGVER "$PKGVER" PKGREL "$PKGREL" \
      EPOCH "$EPOCH_LINE" PKGDESC "$PKGDESC" URL "$URL" ARCH "$ARCH" \
      LICENSE "$LICENSE" DEPENDS "$DEPENDS" >"$PDIR/PKGBUILD"
    ;;
  *)
    warn "$PKGNAME: unknown strategy '$STRAT'; skipping"
    continue
    ;;
  esac

  # Generate .SRCINFO when makepkg is available; it is always generated,
  # never authored by hand.
  if command -v makepkg >/dev/null 2>&1; then
    ( cd "$PDIR" && makepkg --printsrcinfo >.SRCINFO 2>/dev/null ) \
      || warn "$PKGNAME: makepkg --printsrcinfo failed"
  fi
done

warn "done. build tree at: $PKGROOT"
if ! command -v makepkg >/dev/null 2>&1; then
  warn "makepkg not present: .SRCINFO not generated. Run 'makepkg --printsrcinfo'"
  warn "in each package directory on an Arch host before building."
fi

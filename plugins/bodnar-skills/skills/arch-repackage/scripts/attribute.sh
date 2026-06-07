#!/usr/bin/env bash
# attribute.sh — Phase 3 of arch-repackage.
# Join an inventory against the target's own package database to decide, for
# each path, which upstream package owns it (or that it is unmanaged).
#
# The target's package DB is parsed OFFLINE and directly: pacman, dpkg and apk
# databases are plain text and are read with awk. rpm's DB is binary; if the
# `rpm` tool is available it is queried with --dbpath, otherwise every rpm-era
# file is reported UNMANAGED and a warning is emitted.
#
# Emits TSV to stdout: path<TAB>owner<TAB>distro[<TAB>conffile]
# With --meta-out, also writes a package-metadata TSV for Phase 4 to consume.
set -euo pipefail

ROOT=""
INV=""
META_OUT=""

die()  { printf 'attribute.sh: %s\n' "$*" >&2; exit 1; }
warn() { printf 'attribute.sh: %s\n' "$*" >&2; }
usage() {
  cat >&2 <<'EOF'
Usage: attribute.sh --root <DIR> --inventory <TSV> [--meta-out <TSV>]

  --root        Target root directory (same root passed to inventory.sh)
  --inventory   Inventory TSV produced by inventory.sh
  --meta-out    Optional path to write per-package metadata TSV

Emits TSV to stdout: path<TAB>owner<TAB>distro[<TAB>conffile]
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)      ROOT="${2:-}";     shift 2 ;;
    --inventory) INV="${2:-}";      shift 2 ;;
    --meta-out)  META_OUT="${2:-}"; shift 2 ;;
    -h|--help)   usage ;;
    *)           die "unknown argument: $1" ;;
  esac
done
[[ -n "$ROOT" && -n "$INV" ]] || usage
[[ -d "$ROOT" ]] || die "root is not a directory: $ROOT"
[[ -f "$INV"  ]] || die "inventory not found: $INV"
[[ "$ROOT" != "/" ]] && ROOT="${ROOT%/}"

# --- distro detection ----------------------------------------------------
DISTRO="unknown"
if [[ -r "$ROOT/etc/os-release" ]]; then
  DISTRO="$( set -a; . "$ROOT/etc/os-release" 2>/dev/null; printf '%s' "${ID:-unknown}" )"
fi

TOOL="none"
if   [[ -d "$ROOT/var/lib/pacman/local" ]]; then TOOL="pacman"
elif [[ -f "$ROOT/var/lib/dpkg/status"  ]]; then TOOL="dpkg"
elif [[ -d "$ROOT/var/lib/rpm"          ]]; then TOOL="rpm"
elif [[ -f "$ROOT/lib/apk/db/installed" || -f "$ROOT/var/lib/apk/db/installed" ]]; then TOOL="apk"
fi
warn "distro=$DISTRO db-tool=$TOOL"

OWN="$(mktemp)"           # path<TAB>pkg<TAB>flag(conffile|"")
trap 'rm -f "$OWN"' EXIT

# --- ownership extraction ------------------------------------------------
case "$TOOL" in
pacman)
  for d in "$ROOT"/var/lib/pacman/local/*/; do
    [[ -d "$d" ]] || continue
    [[ -f "$d/files" && -f "$d/desc" ]] || continue
    pkg="$(awk '/^%NAME%$/{getline; print; exit}' "$d/desc")"
    [[ -n "$pkg" ]] || continue
    awk -v pkg="$pkg" '
      /^%FILES%$/  { sec="files"; next }
      /^%BACKUP%$/ { sec="backup"; next }
      /^%[A-Z]+%$/ { sec=""; next }
      sec=="files"  && NF { p=$0; sub(/\/$/,"",p); if(p!="") files["/" p]=1 }
      sec=="backup" && NF { split($0,a,"\t"); p=a[1]; sub(/\/$/,"",p);
                            if(p!="") back["/" p]=1 }
      END { for (f in files) print f "\t" pkg "\t" (((f) in back)?"conffile":"") }
    ' "$d/files" >>"$OWN"
  done
  ;;
dpkg)
  for lst in "$ROOT"/var/lib/dpkg/info/*.list; do
    [[ -f "$lst" ]] || continue
    base="${lst%.list}"
    conf="${base}.conffiles"
    pkg="$(basename "$base")"; pkg="${pkg%%:*}"
    awk -v pkg="$pkg" -v conf="$conf" '
      BEGIN { while ((getline l < conf) > 0) { sub(/\/$/,"",l); cf[l]=1 } }
      { p=$0; sub(/\/$/,"",p); if (p=="") next;
        print p "\t" pkg "\t" ((p in cf)?"conffile":"") }
    ' "$lst" >>"$OWN"
  done
  ;;
apk)
  apkdb="$ROOT/lib/apk/db/installed"
  [[ -f "$apkdb" ]] || apkdb="$ROOT/var/lib/apk/db/installed"
  awk '
    /^P:/ { pkg=substr($0,3); next }
    /^F:/ { dir=substr($0,3); print "/" dir "\t" pkg "\t"; next }
    /^R:/ { f=substr($0,3); print "/" dir "/" f "\t" pkg "\t"; next }
  ' "$apkdb" >>"$OWN"
  ;;
rpm)
  if command -v rpm >/dev/null 2>&1; then
    while IFS= read -r pkg; do
      [[ -n "$pkg" ]] || continue
      cf="$(rpm --dbpath "$ROOT/var/lib/rpm" -qc "$pkg" 2>/dev/null || true)"
      while IFS= read -r f; do
        [[ -n "$f" ]] || continue
        flag=""
        grep -qxF "$f" <<<"$cf" && flag="conffile"
        printf '%s\t%s\t%s\n' "$f" "$pkg" "$flag" >>"$OWN"
      done < <(rpm --dbpath "$ROOT/var/lib/rpm" -ql "$pkg" 2>/dev/null || true)
    done < <(rpm --dbpath "$ROOT/var/lib/rpm" -qa --qf '%{NAME}\n' 2>/dev/null || true)
  else
    warn "rpm database present but 'rpm' tool unavailable; all files UNMANAGED"
  fi
  ;;
none)
  warn "no recognised package database; all files UNMANAGED"
  ;;
esac

# --- join inventory against ownership ------------------------------------
awk -F'\t' -v distro="$DISTRO" 'BEGIN{OFS="\t"}
  FNR==NR { if ($1=="" ) next; owner[$1]=$2; conf[$1]=$3; next }
  /^#/ { next }
  {
    p=$1
    o=(p in owner)?owner[p]:"UNMANAGED"
    c=(p in conf)?conf[p]:""
    if (c!="") print p, o, distro, c
    else       print p, o, distro
  }
' "$OWN" "$INV" | LC_ALL=C sort -t$'\t' -k1,1

# --- optional package metadata -------------------------------------------
[[ -n "$META_OUT" ]] || exit 0

emit_meta_header() { printf '# pkg\tversion\tarch\tdesc\turl\tlicense\tdepends\n'; }

case "$TOOL" in
pacman)
  { emit_meta_header
    for d in "$ROOT"/var/lib/pacman/local/*/; do
      [[ -f "$d/desc" ]] || continue
      awk -F'\n' 'BEGIN{RS="";OFS="\t"}
        {
          delete v
          n=split($0, lines, "\n")
          key=""
          for (i=1;i<=n;i++) {
            if (lines[i] ~ /^%[A-Z]+%$/) { key=lines[i]; gsub(/%/,"",key); v[key]="" }
            else if (key!="" && lines[i]!="") {
              v[key]=(v[key]==""?lines[i]:v[key] ", " lines[i])
            }
          }
          print v["NAME"], v["VERSION"], v["ARCH"], v["DESC"], v["URL"], \
                v["LICENSE"], v["DEPENDS"]
        }' "$d/desc"
    done
  } >"$META_OUT"
  ;;
dpkg)
  { emit_meta_header
    awk 'BEGIN{RS="";FS="\n";OFS="\t"}
      {
        pkg=ver=arch=desc=url=dep=""
        for (i=1;i<=NF;i++) {
          if ($i ~ /^Package: /)      pkg=substr($i,10)
          else if ($i ~ /^Version: /) ver=substr($i,10)
          else if ($i ~ /^Architecture: /) arch=substr($i,15)
          else if ($i ~ /^Homepage: /)     url=substr($i,11)
          else if ($i ~ /^Depends: /)      dep=substr($i,10)
          else if ($i ~ /^Description: /)  desc=substr($i,14)
        }
        if (pkg!="") print pkg, ver, arch, desc, url, "", dep
      }' "$ROOT/var/lib/dpkg/status"
  } >"$META_OUT"
  ;;
apk)
  apkdb="$ROOT/lib/apk/db/installed"
  [[ -f "$apkdb" ]] || apkdb="$ROOT/var/lib/apk/db/installed"
  { emit_meta_header
    awk 'BEGIN{RS="";FS="\n";OFS="\t"}
      {
        pkg=ver=arch=desc=url=lic=dep=""
        for (i=1;i<=NF;i++) {
          c=substr($i,1,2)
          if      (c=="P:") pkg=substr($i,3)
          else if (c=="V:") ver=substr($i,3)
          else if (c=="A:") arch=substr($i,3)
          else if (c=="T:") desc=substr($i,3)
          else if (c=="U:") url=substr($i,3)
          else if (c=="L:") lic=substr($i,3)
          else if (c=="D:") dep=substr($i,3)
        }
        if (pkg!="") { gsub(/ /,", ",dep); print pkg,ver,arch,desc,url,lic,dep }
      }' "$apkdb"
  } >"$META_OUT"
  ;;
rpm)
  if command -v rpm >/dev/null 2>&1; then
    { emit_meta_header
      rpm --dbpath "$ROOT/var/lib/rpm" -qa \
        --qf '%{NAME}\t%{VERSION}-%{RELEASE}\t%{ARCH}\t%{SUMMARY}\t%{URL}\t%{LICENSE}\t\n' \
        2>/dev/null || true
    } >"$META_OUT"
  else
    emit_meta_header >"$META_OUT"
    warn "rpm tool unavailable; --meta-out written with header only"
  fi
  ;;
*)
  emit_meta_header >"$META_OUT"
  ;;
esac
warn "package metadata written: $META_OUT"

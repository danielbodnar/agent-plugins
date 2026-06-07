#!/usr/bin/env bash
# plan.sh — Phase 4 of arch-repackage.
# Fold an attribution table into a draft repackage-manifest.json: one leaf
# package per upstream package, synthetic <os>-local-* packages for unmanaged
# files, and a four-node meta-package tree (system -> base/extras/local).
#
# The emitted manifest is a DRAFT. Layer assignment is heuristic and meta-tree
# edges are coarse; both are meant to be refined by hand before Phase 5.
#
# Requires jq.
set -euo pipefail

ATTR=""
INV=""
META=""
OS_NAME=""
ARCH="x86_64"
PACKAGER="arch-repackage <nobody@localhost>"

die()  { printf 'plan.sh: %s\n' "$*" >&2; exit 1; }
warn() { printf 'plan.sh: %s\n' "$*" >&2; }
usage() {
  cat >&2 <<'EOF'
Usage: plan.sh --attribution <TSV> --os-name <NAME> [options]

  --attribution  Attribution TSV produced by attribute.sh   (required)
  --os-name      Short slug for the source OS, e.g. "acme"   (required)
  --inventory    Inventory TSV (reserved; not yet consumed)
  --meta         Package-metadata TSV from attribute.sh --meta-out
  --arch         Target architecture for leaf packages (default x86_64)
  --packager     Packager string for manifest defaults

Emits repackage-manifest.json to stdout.
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --attribution) ATTR="${2:-}";     shift 2 ;;
    --inventory)   INV="${2:-}";      shift 2 ;;
    --meta)        META="${2:-}";     shift 2 ;;
    --os-name)     OS_NAME="${2:-}";  shift 2 ;;
    --arch)        ARCH="${2:-}";     shift 2 ;;
    --packager)    PACKAGER="${2:-}"; shift 2 ;;
    -h|--help)     usage ;;
    *)             die "unknown argument: $1" ;;
  esac
done
[[ -n "$ATTR" && -n "$OS_NAME" ]] || usage
[[ -f "$ATTR" ]] || die "attribution not found: $ATTR"
[[ -z "$META" || -f "$META" ]] || die "meta file not found: $META"
command -v jq >/dev/null 2>&1 || die "jq is required"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- PKGFILES: pkg<TAB>path<TAB>isbackup<TAB>native -----------------------
# Native rows come straight from attribution; UNMANAGED rows are bucketed into
# synthetic <os>-local-* packages by path prefix.
PKGFILES="$TMP/pkgfiles.tsv"
awk -F'\t' -v os="$OS_NAME" 'BEGIN{OFS="\t"}
  /^#/ { next }
  {
    path=$1; owner=$2; conf=$4
    if (owner!="UNMANAGED") {
      print owner, path, ((conf=="conffile")?1:0), 1
      next
    }
    # synthetic bucket
    if      (path ~ /\/systemd\/system\//) bucket="local-units"
    else if (path ~ /^\/etc\//)            bucket="local-etc"
    else if (path ~ /^\/opt\//)            bucket="local-opt"
    else if (path ~ /^\/usr\/local\//)     bucket="local-usrlocal"
    else if (path ~ /^\/srv\//)            bucket="local-srv"
    else                                   bucket="local-misc"
    isback=(path ~ /^\/etc\//)?1:0
    print os "-" bucket, path, isback, 0
  }
' "$ATTR" | LC_ALL=C sort -t$'\t' -k1,1 -k2,2 >"$PKGFILES"

[[ -s "$PKGFILES" ]] || die "no packageable files derived from attribution"

# --- leaf package JSON array ---------------------------------------------
# One awk pass groups rows by package and emits a JSON array of leaf entries.
LEAVES="$TMP/leaves.json"
awk -F'\t' -v arch="$ARCH" -v os="$OS_NAME" '
  function esc(s,   r) { r=s;
    gsub(/\\/,"\\\\",r); gsub(/"/,"\\\"",r);
    gsub(/\t/,"\\t",r);  gsub(/\n/,"\\n",r); gsub(/\r/,"\\r",r);
    return r }
  function flush(   i,first) {
    if (cur=="") return
    printf "%s{\"pkgname\":\"%s\",\"kind\":\"leaf\",\"strategy\":\"binary\"",
           (emitted?",":""), esc(cur)
    printf ",\"native\":%s", (native[cur]?"true":"false")
    printf ",\"files\":["
    first=1
    for (i=1;i<=nf[cur];i++) {
      printf "%s\"%s\"", (first?"":","), esc(files[cur,i]); first=0 }
    printf "]"
    printf ",\"backup\":["
    first=1
    for (i=1;i<=nb[cur];i++) {
      printf "%s\"%s\"", (first?"":","), esc(backup[cur,i]); first=0 }
    printf "]}"
    emitted=1
  }
  BEGIN { printf "[" }
  {
    pkg=$1
    if (pkg!=cur) { flush(); cur=pkg; nf[cur]=0; nb[cur]=0; native[cur]=($4==1) }
    nf[cur]++; files[cur,nf[cur]]=$2
    if ($3==1) { nb[cur]++; backup[cur,nb[cur]]=$2 }
  }
  END { flush(); printf "]" }
' "$PKGFILES" >"$LEAVES"

# --- version sanitisation + metadata join --------------------------------
# jq merges optional upstream metadata, sanitises versions and fills defaults.
META_JSON="$TMP/meta.json"
if [[ -n "$META" ]]; then
  jq -R -s 'split("\n")
    | map(select(length>0 and (startswith("#")|not)))
    | map(split("\t"))
    | map({(.[0]): {version:.[1],arch:.[2],desc:.[3],url:.[4],
                    license:.[5],depends:.[6]}})
    | add // {}' "$META" >"$META_JSON"
else
  echo '{}' >"$META_JSON"
fi

ENRICHED="$TMP/enriched.json"
jq --slurpfile meta "$META_JSON" --arg os "$OS_NAME" --arg arch "$ARCH" '
  def sanitize_ver:
    # split [epoch:]ver-rel ; scrub invalid pkgver chars; pkgrel must be a
    # plain integer (optionally one decimal) so take the leading digit run.
    . as $v
    | ( if ($v | test(":")) then ($v | split(":")[0]) else "0" end ) as $epoch
    | ( if ($v | test(":")) then ($v | sub("^[^:]*:";"")) else $v end ) as $rest
    | ( if ($rest | test("-")) then ($rest | sub("-[^-]*$";"")) else $rest end ) as $pv
    | ( if ($rest | test("-")) then ($rest | sub("^.*-";"")) else "1" end ) as $praw
    | { epoch: ($epoch|tonumber? // 0),
        pkgver: ($pv | gsub("[^A-Za-z0-9._]";"_")),
        pkgrel: (($praw | capture("^(?<n>[0-9]+)").n) // "1") };
  ($meta[0]) as $m
  | map(
      .pkgname as $name
      | ($m[$name] // {}) as $um
      | (($um.version // "1.0.0") | sanitize_ver) as $sv
      | . + {
          pkgver: $sv.pkgver,
          pkgrel: $sv.pkgrel,
          epoch:  $sv.epoch,
          pkgdesc: ( $um.desc
                     // (if .native then ($name + " (repackaged)")
                         else ("Unmanaged " + ($name|sub("^.*-local-";"")) +
                               " files from " + $os) end) ),
          url:     ($um.url // ""),
          license: ( if (($um.license // "")|length)>0
                     then [$um.license] else ["custom:unknown"] end ),
          arch:    [$arch],
          depends: [],
          origin:  ( if .native
                     then {native_pkg:$name, native_distro:"upstream"}
                     else null end )
        }
    )
' "$LEAVES" >"$ENRICHED"

# --- layer classification -------------------------------------------------
# Tiny essential set lands in "base"; other native pkgs "extras"; synthetic
# (non-native) pkgs "local".
LAYERS="$TMP/layers.tsv"
jq -r '.[] | [.pkgname, (.native|tostring)] | @tsv' "$ENRICHED" \
| awk -F'\t' 'BEGIN{
    split("bash coreutils glibc libc6 systemd util-linux filesystem " \
          "base-files base linux linux-firmware musl busybox shadow " \
          "login pam libpam libc-bin", b, " ")
    for (i in b) BASE[b[i]]=1
  }
  {
    if ($2=="false")        layer="local"
    else if ($1 in BASE)    layer="base"
    else                    layer="extras"
    print $1 "\t" layer
  }' >"$LAYERS"

# --- meta-package entries -------------------------------------------------
mapfile -t BASE_PKGS   < <(awk -F'\t' '$2=="base"{print $1}'   "$LAYERS")
mapfile -t EXTRA_PKGS  < <(awk -F'\t' '$2=="extras"{print $1}' "$LAYERS")
mapfile -t LOCAL_PKGS  < <(awk -F'\t' '$2=="local"{print $1}'  "$LAYERS")

# Build a JSON string array from positional args (jq handles escaping).
mk_arr() { printf '%s\n' "$@" | jq -R . | jq -s 'map(select(length>0))'; }

BASE_ARR="$(mk_arr "${BASE_PKGS[@]+"${BASE_PKGS[@]}"}")"
EXTRA_ARR="$(mk_arr "${EXTRA_PKGS[@]+"${EXTRA_PKGS[@]}"}")"
LOCAL_ARR="$(mk_arr "${LOCAL_PKGS[@]+"${LOCAL_PKGS[@]}"}")"

METAS="$TMP/metas.json"
jq -n --arg os "$OS_NAME" --arg arch "$ARCH" \
      --argjson base "$BASE_ARR" \
      --argjson extras "$EXTRA_ARR" \
      --argjson local "$LOCAL_ARR" '
  def meta($name; $desc; $deps):
    { pkgname:$name, kind:"meta", strategy:"meta",
      pkgver:"1.0.0", pkgrel:"1", epoch:0,
      pkgdesc:$desc, arch:["any"], url:"", license:["custom:meta"],
      depends:$deps, files:[], backup:[], native:false, origin:null };
  [ meta($os+"-base";   "Base layer of "+$os;   $base),
    meta($os+"-extras"; "Extra packages of "+$os; $extras),
    meta($os+"-local";  "Site-local files of "+$os; $local),
    meta($os+"-system"; "Complete "+$os+" system";
         [$os+"-base", $os+"-extras", $os+"-local"]) ]
' >"$METAS"

# --- assemble manifest ----------------------------------------------------
jq -n \
  --arg os "$OS_NAME" \
  --arg arch "$ARCH" \
  --arg packager "$PACKAGER" \
  --slurpfile leaves "$ENRICHED" \
  --slurpfile metas "$METAS" \
  '
  ($leaves[0]) as $L
  | ($metas[0]) as $M
  | {
      schema: "https://bitbuilder.cloud/schemas/repackage-manifest/v1.0.0",
      target: { os: $os, arch: $arch },
      defaults: { packager: $packager, pkgrel: "1" },
      packages: ($M + $L),
      tree: {
        root: ($os + "-system"),
        nodes: ($M | map({ (.pkgname): { depends: .depends } }) | add)
      }
    }
  '

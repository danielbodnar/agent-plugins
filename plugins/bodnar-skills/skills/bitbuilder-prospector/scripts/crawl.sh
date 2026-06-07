#!/usr/bin/env bash
# Usage: bash scripts/crawl.sh <TARGET_URL> <apex_domain> <output_dir>
# Polite mirror with sane defaults. Writes into output_dir.

set -euo pipefail

TARGET_URL="${1:?TARGET_URL required}"
APEX="${2:?apex_domain required}"
OUT_DIR="${3:?output_dir required}"

mkdir -p "$OUT_DIR"

wget \
  --mirror \
  --convert-links \
  --adjust-extension \
  --page-requisites \
  --no-parent \
  --random-wait --wait=1.5 --limit-rate=500k \
  --reject-regex '(/wp-admin/|/wp-json/|\?replytocom=|/feed/?$)' \
  --domains="${APEX},www.${APEX}" \
  --level=3 \
  --tries=2 --timeout=20 \
  -e robots=on \
  --user-agent="Mozilla/5.0 (compatible; BitBuilderAudit/1.0; +https://bitbuilder.cloud/about)" \
  -P "$OUT_DIR" \
  "$TARGET_URL" || {
    echo "wget exited non-zero (may be partial mirror)" >&2
    # Non-fatal; downstream checks determine if enough content was captured
  }

# Report what was captured
HTML_COUNT=$(find "$OUT_DIR" -name '*.html' -type f | wc -l)
TOTAL_BYTES=$(du -sb "$OUT_DIR" 2>/dev/null | awk '{print $1}')

echo ""
echo "Mirror summary:"
echo "  HTML files: $HTML_COUNT"
echo "  Total bytes: $TOTAL_BYTES"
echo "  Output dir: $OUT_DIR"

# Exit 2 if insufficient (caller should fall back to Browser Rendering)
if [ "$HTML_COUNT" -lt 3 ] || [ "$TOTAL_BYTES" -lt 51200 ]; then
  echo "Insufficient capture; caller should fall back." >&2
  exit 2
fi

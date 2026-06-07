#!/usr/bin/env bash
# validate-handbook.sh: Check a handbook directory against the quality gates
# defined in the engineering-handbook skill's SKILL.md.
#
# Usage:
#   scripts/validate-handbook.sh <handbook-dir>
#
# Example:
#   scripts/validate-handbook.sh ./handbook
#
# Reports per-file violations of:
#   1. Missing DRI line
#   2. Missing "Why this exists" section
#   3. No success criteria
#   4. No cross-links
#   5. Em-dashes in prose (Daniel Bodnar's stated preference, also generally
#      better technical writing)
#   6. Pages with too-long unbroken sections (>40 lines without a heading)
#
# Exit code 0 if all files pass, 1 otherwise.

set -uo pipefail

DIR="${1:-}"
if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
  echo "Usage: $0 <handbook-dir>" >&2
  exit 2
fi

TOTAL=0
FAILED=0
WARNINGS=0

check_file() {
  local f="$1"
  local rel="${f#$DIR/}"
  local issues=()
  local is_meta=false
  local base
  base="$(basename "$f")"
  if [[ "$base" == "README.md" ]] || [[ "$base" == "publishing.md" ]] || [[ "$base" == "_TEMPLATE.md" ]]; then
    is_meta=true
  fi

  # Quality gate 1: DRI present (accepts **DRI:**, **Section DRI:**,
  # or **Handbook DRI:** to allow some variation).
  if ! grep -qE '^\*\*(Section |Handbook )?DRI:\*\*' "$f"; then
    issues+=("missing DRI line")
  fi

  # Quality gates 2, 3, 4 apply to process pages but not to README/nav pages
  # or to meta-documents like publishing.md. These exist to point at neighbors
  # and document the deploy contract; they have their own structure.
  if ! $is_meta; then
    # Quality gate 2: "Why this exists" section
    if ! grep -q '^## Why this exists' "$f"; then
      issues+=("missing 'Why this exists' section")
    fi

    # Quality gate 3: Success criteria section
    if ! grep -q '^## Success criteria' "$f"; then
      issues+=("missing 'Success criteria' section")
    fi

    # Quality gate 4: Cross-links present
    local link_count
    link_count=$(grep -cE '\[`?[^]]+`?\]\(\.' "$f" || true)
    if [ "$link_count" -lt 2 ]; then
      issues+=("only $link_count cross-links (target is 2+)")
    fi
  fi

  # Quality gate 5: Em-dashes in prose
  local em_count
  em_count=$(grep -c '—' "$f" || true)
  if [ "$em_count" -gt 0 ]; then
    issues+=("$em_count em-dash(es) found")
  fi

  # Quality gate 6: Long unbroken sections (any heading ## or deeper resets).
  # Use ##+ pattern instead of #{2,} for portable awk (POSIX awk lacks {n,}).
  local long_section
  long_section=$(awk '
    BEGIN { last_heading = 0 }
    /^##+ / { last_heading = NR; next }
    last_heading > 0 && NR - last_heading > 40 { print NR; exit }
  ' "$f")
  if [ -n "$long_section" ]; then
    issues+=("long unbroken section near line $long_section (>40 lines without heading)")
  fi

  TOTAL=$((TOTAL + 1))
  if [ ${#issues[@]} -gt 0 ]; then
    FAILED=$((FAILED + 1))
    echo "  FAIL: $rel"
    for i in "${issues[@]}"; do
      echo "    - $i"
    done
  fi
}

echo "Validating handbook at: $DIR"
echo ""

while IFS= read -r -d '' f; do
  check_file "$f"
done < <(find "$DIR" -type f -name '*.md' -print0)

echo ""
echo "Total files: $TOTAL"
echo "Files with issues: $FAILED"
echo "Files passing: $((TOTAL - FAILED))"

if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "All quality gates passed."
  exit 0
else
  echo ""
  echo "Some files have unresolved issues. See above for per-file details."
  exit 1
fi

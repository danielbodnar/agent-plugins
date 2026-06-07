#!/usr/bin/env bash
# init-handbook.sh: Scaffold a new engineering handbook from the bundled skeleton.
#
# Usage:
#   scripts/init-handbook.sh <destination-dir> [--scope minimum|growth|scale]
#
# Examples:
#   scripts/init-handbook.sh ./handbook
#   scripts/init-handbook.sh ../my-org/handbook --scope minimum
#   scripts/init-handbook.sh /tmp/test-handbook --scope scale
#
# The script copies the canonical handbook skeleton into the destination
# directory. With --scope minimum, it strips planning, monitoring, and
# career-ladder pages that small teams do not need. With --scope growth
# (default) or --scope scale, it includes the full tree.
#
# After running this, every page is a stub with the canonical structure
# (DRI, Why this exists, body TBD, Success criteria, Related). Fill the
# stubs in by drawing content from the references files in this skill.

set -euo pipefail

# Resolve the directory this script lives in, then the skeleton sibling
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
SKELETON_DIR="$SKILL_DIR/assets/handbook-skeleton"

if [ ! -d "$SKELETON_DIR" ]; then
  echo "Error: skeleton not found at $SKELETON_DIR" >&2
  exit 1
fi

# Parse args
DEST="${1:-}"
SCOPE="growth"
shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --scope)
      SCOPE="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$DEST" ]; then
  echo "Usage: $0 <destination-dir> [--scope minimum|growth|scale]" >&2
  exit 1
fi

if [ -e "$DEST" ]; then
  echo "Error: $DEST already exists. Refusing to overwrite." >&2
  echo "Move or remove the existing directory first." >&2
  exit 1
fi

# Copy the skeleton
mkdir -p "$DEST"
cp -r "$SKELETON_DIR"/. "$DEST"/

# Apply scope-specific pruning
case "$SCOPE" in
  minimum)
    # Small teams: keep direction & culture (values + principles only),
    # workflows (issues, code-review, MRs), and a single incident page.
    # Strip planning, monitoring, FCL, infradev, etc.
    rm -rf "$DEST/03-planning"
    rm -f "$DEST/05-monitoring-and-quality/infradev.md"
    rm -f "$DEST/05-monitoring-and-quality/technical-debt.md"
    rm -f "$DEST/05-monitoring-and-quality/performance.md"
    rm -f "$DEST/04-incident-management/feature-change-locks.md"
    rm -f "$DEST/04-incident-management/slos-and-error-budgets.md"
    rm -f "$DEST/01-direction-and-culture/three-year-strategy.md"
    rm -f "$DEST/01-direction-and-culture/engineering-excellence.md"
    rm -f "$DEST/02-workflows/security-review.md"
    rm -f "$DEST/02-workflows/ci-cd.md"
    echo "Scope: minimum (small teams, ~10 files)"
    ;;
  growth)
    # Default. Keep most of the tree, drop the most enterprise-y pieces.
    rm -f "$DEST/04-incident-management/feature-change-locks.md"
    echo "Scope: growth (mid-size teams, ~22 files)"
    ;;
  scale)
    # Keep everything.
    echo "Scope: scale (full GitLab-style tree, all 27+ files)"
    ;;
  *)
    echo "Unknown scope: $SCOPE (expected minimum|growth|scale)" >&2
    exit 1
    ;;
esac

# Show what was created
FILE_COUNT=$(find "$DEST" -type f -name '*.md' | wc -l | tr -d ' ')
echo ""
echo "Handbook scaffold created at: $DEST"
echo "Files: $FILE_COUNT markdown files"
echo ""
echo "Next steps:"
echo "  1. Fill in the [TBD] placeholders in each page using the references"
echo "     files from this skill as source material."
echo "  2. Replace **DRI:** [TBD] with the actual owner of each page."
echo "  3. Pick a publishing target (see references/publishing.md) and copy"
echo "     the matching config from assets/configs/."
echo "  4. Document your deploy in $DEST/publishing.md."

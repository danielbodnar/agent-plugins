#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# zoho-create — Create Zoho Projects Tasks and Issues from JSON or CSV
#
# Reads a file of items and creates them in Zoho Projects via the REST API.
# Tasks = high-level, abstract project management items.
# Issues = lower-level, concrete actionable work items.
#
# SETUP (one-time, Self Client flow, no web server needed):
#
#   1. Go to https://api-console.zoho.com
#   2. Click "Add Client" > choose "Self Client"
#   3. Note your Client ID and Client Secret
#   4. Under "Generate Code", paste these scopes:
#        ZohoProjects.portals.READ,
#        ZohoProjects.projects.READ,
#        ZohoProjects.tasks.CREATE,
#        ZohoProjects.tasks.READ,
#        ZohoBugTracker.bugs.CREATE,
#        ZohoBugTracker.bugs.READ
#   5. Set duration (10 min is fine), click "Create"
#   6. Copy the grant code and IMMEDIATELY run (expires in 2 min):
#
#        curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
#          -d "code=PASTE_GRANT_CODE" \
#          -d "client_id=YOUR_CLIENT_ID" \
#          -d "client_secret=YOUR_CLIENT_SECRET" \
#          -d "grant_type=authorization_code"
#
#   7. Save the refresh_token from the response. It never expires.
#
# AUTH:
#   Tokens are Zoho-oauthtoken bearer tokens (not standard Bearer).
#   Header format: "Authorization: Zoho-oauthtoken {access_token}"
#   Access tokens expire after 1 hour; the script refreshes automatically.
#
# ENV VARS (required):
#   ZOHO_CLIENT_ID
#   ZOHO_CLIENT_SECRET
#   ZOHO_REFRESH_TOKEN
#   ZOHO_PORTAL_ID
#   ZOHO_PROJECT_ID
#
# ENV VARS (optional):
#   ZOHO_ACCOUNTS_DOMAIN   (default: https://accounts.zoho.com)
#   ZOHO_API_DOMAIN        (default: https://projectsapi.zoho.com)
#
# USAGE:
#   ./zoho-create items.json [--dry-run]
#   ./zoho-create items.csv  [--dry-run]
#
# INPUT FORMAT (JSON):
#   [
#     {
#       "type": "task",
#       "title": "Category Name",
#       "description": "High-level summary.",
#       "priority": "High"
#     },
#     {
#       "type": "issue",
#       "title": "Concrete work item",
#       "description": "Detailed description. Use <br> for line breaks."
#     }
#   ]
#
# INPUT FORMAT (CSV):
#   type,title,description,priority
#   task,"Category Name","High-level summary.",High
#   issue,"Concrete work item","Detailed description.",
#
#   Notes on CSV:
#     - Fields with commas or quotes must be double-quoted
#     - Newlines in descriptions are not supported in CSV; use <br> instead
#     - Priority is optional for issues (ignored if present)
#
# DEPENDENCIES: curl, jq
# =============================================================================

# --- Config ------------------------------------------------------------------

ZOHO_CLIENT_ID="${ZOHO_CLIENT_ID:?Set ZOHO_CLIENT_ID}"
ZOHO_CLIENT_SECRET="${ZOHO_CLIENT_SECRET:?Set ZOHO_CLIENT_SECRET}"
ZOHO_REFRESH_TOKEN="${ZOHO_REFRESH_TOKEN:?Set ZOHO_REFRESH_TOKEN}"
ZOHO_PORTAL_ID="${ZOHO_PORTAL_ID:?Set ZOHO_PORTAL_ID}"
ZOHO_PROJECT_ID="${ZOHO_PROJECT_ID:?Set ZOHO_PROJECT_ID}"

ACCOUNTS_DOMAIN="${ZOHO_ACCOUNTS_DOMAIN:-https://accounts.zoho.com}"
API_DOMAIN="${ZOHO_API_DOMAIN:-https://projectsapi.zoho.com}"

BASE_URL="${API_DOMAIN}/restapi/portal/${ZOHO_PORTAL_ID}/projects/${ZOHO_PROJECT_ID}"
TOKEN_URL="${ACCOUNTS_DOMAIN}/oauth/v2/token"

ACCESS_TOKEN=""

# Rate limit: 100 requests / 2 minutes. 1.5s is conservative.
RATE_LIMIT_SLEEP=1.5

# --- Args --------------------------------------------------------------------

INPUT_FILE="${1:-}"
DRY_RUN=false

if [[ -z "$INPUT_FILE" ]]; then
  echo "Usage: $0 <file.json|file.csv> [--dry-run]" >&2
  exit 1
fi

if [[ "${2:-}" == "--dry-run" ]] || [[ "${INPUT_FILE}" == "--dry-run" ]]; then
  DRY_RUN=true
  # Handle --dry-run as first arg
  if [[ "${INPUT_FILE}" == "--dry-run" ]]; then
    INPUT_FILE="${2:-}"
    if [[ -z "$INPUT_FILE" ]]; then
      echo "Usage: $0 <file.json|file.csv> [--dry-run]" >&2
      exit 1
    fi
  fi
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "ERROR: File not found: $INPUT_FILE" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required. Install with: apt install jq / brew install jq" >&2
  exit 1
fi

# --- Functions ---------------------------------------------------------------

get_access_token() {
  local response
  response=$(curl -s -X POST "${TOKEN_URL}" \
    -d "refresh_token=${ZOHO_REFRESH_TOKEN}" \
    -d "client_id=${ZOHO_CLIENT_ID}" \
    -d "client_secret=${ZOHO_CLIENT_SECRET}" \
    -d "grant_type=refresh_token")

  ACCESS_TOKEN=$(echo "$response" | jq -r '.access_token // empty')

  if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "ERROR: Failed to get access token" >&2
    echo "$response" | jq . 2>/dev/null || echo "$response" >&2
    exit 1
  fi
  echo "Authenticated."
}

create_task() {
  local title="$1"
  local description="$2"
  local priority="${3:-None}"

  if $DRY_RUN; then
    printf "  [DRY RUN] TASK: %s (priority: %s)\n" "$title" "$priority"
    return 0
  fi

  local response
  response=$(curl -s -X POST "${BASE_URL}/tasks/" \
    -H "Authorization: Zoho-oauthtoken ${ACCESS_TOKEN}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "name=${title}" \
    --data-urlencode "description=${description}" \
    --data-urlencode "priority=${priority}")

  local key
  key=$(echo "$response" | jq -r '.tasks[0].key // empty')
  local id
  id=$(echo "$response" | jq -r '.tasks[0].id_string // empty')

  if [[ -n "$key" ]]; then
    printf "  TASK: %s — %s (id: %s)\n" "$key" "$title" "$id"
  else
    printf "  ERROR creating task: %s\n" "$title" >&2
    echo "$response" | jq . 2>/dev/null || echo "$response" >&2
  fi

  sleep "$RATE_LIMIT_SLEEP"
}

create_issue() {
  local title="$1"
  local description="$2"

  if $DRY_RUN; then
    printf "  [DRY RUN] ISSUE: %s\n" "$title"
    return 0
  fi

  local response
  response=$(curl -s -X POST "${BASE_URL}/bugs/" \
    -H "Authorization: Zoho-oauthtoken ${ACCESS_TOKEN}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "title=${title}" \
    --data-urlencode "description=${description}")

  local key
  key=$(echo "$response" | jq -r '.bugs[0].key // empty')
  local id
  id=$(echo "$response" | jq -r '.bugs[0].id_string // empty')

  if [[ -n "$key" ]]; then
    printf "  ISSUE: %s — %s (id: %s)\n" "$key" "$title" "$id"
  else
    printf "  ERROR creating issue: %s\n" "$title" >&2
    echo "$response" | jq . 2>/dev/null || echo "$response" >&2
  fi

  sleep "$RATE_LIMIT_SLEEP"
}

csv_to_json() {
  # Converts a CSV file to the expected JSON array format.
  # Handles double-quoted fields with commas. Does NOT handle newlines in fields.
  local file="$1"
  python3 -c "
import csv, json, sys
with open(sys.argv[1], newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    # Normalize header names to lowercase, stripped
    items = []
    for row in reader:
        normalized = {k.strip().lower(): v.strip() for k, v in row.items()}
        items.append({
            'type': normalized.get('type', ''),
            'title': normalized.get('title', ''),
            'description': normalized.get('description', ''),
            'priority': normalized.get('priority', 'None') or 'None'
        })
    json.dump(items, sys.stdout)
" "$file"
}

load_items() {
  local file="$1"
  local ext="${file##*.}"
  ext="${ext,,}" # lowercase

  case "$ext" in
    json)
      cat "$file"
      ;;
    csv)
      csv_to_json "$file"
      ;;
    *)
      echo "ERROR: Unsupported file type: .$ext (use .json or .csv)" >&2
      exit 1
      ;;
  esac
}

# --- Main --------------------------------------------------------------------

echo "zoho-create"
echo "==========="
printf "Portal:  %s\n" "$ZOHO_PORTAL_ID"
printf "Project: %s\n" "$ZOHO_PROJECT_ID"
printf "Input:   %s\n" "$INPUT_FILE"
printf "Mode:    %s\n" "$($DRY_RUN && echo 'DRY RUN' || echo 'LIVE')"
echo ""

if ! $DRY_RUN; then
  get_access_token
fi

ITEMS=$(load_items "$INPUT_FILE")
TOTAL=$(echo "$ITEMS" | jq 'length')
TASK_COUNT=0
ISSUE_COUNT=0
ERROR_COUNT=0

echo "Loaded $TOTAL items."
echo ""

for i in $(seq 0 $((TOTAL - 1))); do
  type=$(echo "$ITEMS" | jq -r ".[$i].type")
  title=$(echo "$ITEMS" | jq -r ".[$i].title")
  description=$(echo "$ITEMS" | jq -r ".[$i].description")
  priority=$(echo "$ITEMS" | jq -r ".[$i].priority // \"None\"")

  case "$type" in
    task)
      create_task "$title" "$description" "$priority"
      TASK_COUNT=$((TASK_COUNT + 1))
      ;;
    issue)
      create_issue "$title" "$description"
      ISSUE_COUNT=$((ISSUE_COUNT + 1))
      ;;
    *)
      printf "  SKIP: Unknown type '%s' for '%s'\n" "$type" "$title" >&2
      ERROR_COUNT=$((ERROR_COUNT + 1))
      ;;
  esac
done

echo ""
echo "Done. Tasks: $TASK_COUNT, Issues: $ISSUE_COUNT, Skipped: $ERROR_COUNT"

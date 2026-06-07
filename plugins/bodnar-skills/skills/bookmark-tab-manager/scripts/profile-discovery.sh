#!/usr/bin/env bash
# Discover available Chrome profiles
set -euo pipefail

readonly CHROME_USER_DATA_DIR="${CHROME_USER_DATA_DIR:-$HOME/.config/google-chrome}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Discover available Chrome profiles in user data directory.

OPTIONS:
  -d, --data-dir DIR     Chrome user data directory 
                         (default: $CHROME_USER_DATA_DIR)
  -j, --json             Output as JSON
  -h, --help             Show this help message

EXAMPLES:
  # List profiles
  $(basename "$0")

  # JSON output
  $(basename "$0") --json

  # Custom data directory
  $(basename "$0") --data-dir ~/.config/chromium

EOF
}

discover_profiles() {
  local data_dir="$1"
  local output_json="${2:-false}"

  if [[ ! -d "$data_dir" ]]; then
    echo "Error: Chrome user data directory not found: $data_dir" >&2
    exit 1
  fi

  # Find Local State file for profile information
  local local_state="$data_dir/Local State"
  if [[ ! -f "$local_state" ]]; then
    echo "Error: Local State file not found: $local_state" >&2
    exit 1
  fi

  # Extract profile directories
  local profiles=()

  # Default profile
  if [[ -d "$data_dir/Default" ]]; then
    profiles+=("Default")
  fi

  # Numbered profiles
  while IFS= read -r -d '' profile_dir; do
    local profile_name=$(basename "$profile_dir")
    if [[ "$profile_name" =~ ^Profile\ [0-9]+$ ]]; then
      profiles+=("$profile_name")
    fi
  done < <(find "$data_dir" -maxdepth 1 -type d -name "Profile *" -print0 | sort -z)

  if [[ ${#profiles[@]} -eq 0 ]]; then
    echo "No profiles found in $data_dir" >&2
    exit 1
  fi

  if [[ "$output_json" == "true" ]]; then
    # JSON output
    printf '{\n  "dataDir": "%s",\n  "profiles": [\n' "$data_dir"
    for i in "${!profiles[@]}"; do
      local profile="${profiles[$i]}"
      local comma=""
      [[ $i -lt $((${#profiles[@]} - 1)) ]] && comma=","
      printf '    "%s"%s\n' "$profile" "$comma"
    done
    printf '  ]\n}\n'
  else
    # Human-readable output
    echo "Chrome profiles in $data_dir:"
    echo ""
    for profile in "${profiles[@]}"; do
      local profile_path="$data_dir/$profile"
      local bookmarks="$profile_path/Bookmarks"
      local bookmark_count="0"

      if [[ -f "$bookmarks" ]]; then
        # Count bookmarks (rough estimate from JSON)
        bookmark_count=$(grep -o '"url":' "$bookmarks" | wc -l)
      fi

      printf "  • %s\n" "$profile"
      printf "    Path: %s\n" "$profile_path"
      printf "    Bookmarks: %s\n" "$bookmark_count"
      echo ""
    done
  fi
}

main() {
  local data_dir="$CHROME_USER_DATA_DIR"
  local output_json="false"

  while [[ $# -gt 0 ]]; do
    case $1 in
      -d|--data-dir)
        data_dir="$2"
        shift 2
        ;;
      -j|--json)
        output_json="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  discover_profiles "$data_dir" "$output_json"
}

main "$@"

#!/usr/bin/env bash
# Setup systemd user service for Chrome headless
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SERVICE_TEMPLATE="${SCRIPT_DIR}/chrome-headless-template.service"
readonly SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Install systemd user service for Chrome headless bookmark management.

OPTIONS:
  -p, --profile PROFILE   Chrome profile name (default: Default)
  -h, --help             Show this help message

EXAMPLES:
  # Install for Default profile
  $(basename "$0")

  # Install for specific profile
  $(basename "$0") --profile "Profile 1"

  # Enable and start service
  systemctl --user enable --now chrome-headless@Default.service

  # Check status
  systemctl --user status chrome-headless@Default.service

  # View logs
  journalctl --user -u chrome-headless@Default.service -f

EOF
}

main() {
  local profile="Default"

  while [[ $# -gt 0 ]]; do
    case $1 in
      -p|--profile)
        profile="$2"
        shift 2
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

  # Create systemd user directory if needed
  mkdir -p "$SYSTEMD_USER_DIR"

  # Copy service template
  if [[ ! -f "$SERVICE_TEMPLATE" ]]; then
    echo "Error: Service template not found at $SERVICE_TEMPLATE" >&2
    exit 1
  fi

  cp "$SERVICE_TEMPLATE" "$SYSTEMD_USER_DIR/chrome-headless@.service"
  chmod 644 "$SYSTEMD_USER_DIR/chrome-headless@.service"

  echo "✅ Installed service template to $SYSTEMD_USER_DIR/chrome-headless@.service"

  # Reload systemd
  systemctl --user daemon-reload

  echo ""
  echo "Next steps:"
  echo "  1. Enable and start service:"
  echo "     systemctl --user enable --now chrome-headless@${profile}.service"
  echo ""
  echo "  2. Check status:"
  echo "     systemctl --user status chrome-headless@${profile}.service"
  echo ""
  echo "  3. View logs:"
  echo "     journalctl --user -u chrome-headless@${profile}.service -f"
}

main "$@"

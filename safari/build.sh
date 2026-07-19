#!/usr/bin/env bash
# Converts the YouTube Calm WebExtension into a Safari Web Extension Xcode project.
# Run this script from any directory — it locates the repo root automatically.
#
# Usage:
#   ./build.sh                            # bundle ID defaults to com.example.youtube-calm
#   ./build.sh com.yourname.youtube-calm  # supply your own bundle ID
#
# Requirements: macOS, Xcode installed (free from the App Store)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="YouTube Calm"
BUNDLE_ID="${1:-com.example.youtube-calm}"

if ! command -v xcrun &>/dev/null; then
  echo "Error: xcrun not found. Install Xcode from the Mac App Store and try again."
  exit 1
fi

echo "Converting extension for Safari..."
echo "  Source:    $REPO_ROOT"
echo "  Output:    $SCRIPT_DIR/$APP_NAME"
echo "  Bundle ID: $BUNDLE_ID"
echo ""

xcrun safari-web-extension-converter "$REPO_ROOT" \
  --project-location "$SCRIPT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --no-prompt

echo ""
echo "Done. Next steps are in safari/INSTALL.md."

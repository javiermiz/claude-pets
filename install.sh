#!/bin/sh
# One-line installer: curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
set -e
command -v swiftc >/dev/null || { echo "swiftc not found. Install the Command Line Tools first: xcode-select --install"; exit 1; }
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
git clone --quiet --depth 1 https://github.com/javiermiz/claude-pets "$dir"
"$dir/build.sh"

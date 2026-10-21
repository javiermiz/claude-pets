#!/bin/sh
# Builds Claude Pets into ~/Applications/ClaudePets.app and launches it.
# Needs only swiftc (Xcode Command Line Tools); sprites and icon are prebuilt in assets/.
set -e
cd "$(dirname "$0")"
command -v swiftc >/dev/null || { echo "swiftc not found. Install the Command Line Tools: xcode-select --install"; exit 1; }

APP=~/Applications/ClaudePets.app
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
rm -rf "$APP/Contents/Resources/pets"
cp -R assets/pets assets/AppIcon.icns "$APP/Contents/Resources/"
swiftc -O -swift-version 5 main.swift -o "$APP/Contents/MacOS/ClaudePets"
cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>ClaudePets</string>
  <key>CFBundleIdentifier</key><string>com.javiermiz.claudepets</string>
  <key>CFBundleName</key><string>Claude Pets</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
</dict></plist>
EOF
codesign --force -s - "$APP" 2>/dev/null # ad-hoc signature, needed for launch-at-login
touch "$APP" # refresh Finder icon cache
pkill -x ClaudePets && while pgrep -x ClaudePets >/dev/null; do sleep 0.1; done # open reuses a dying instance
open "$APP"
echo "Installed $APP"

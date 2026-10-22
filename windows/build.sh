#!/bin/sh
# Builds dist/ClaudePets-Setup.exe and dist/ClaudePets-windows-x64.zip (runs on macOS, Linux or Windows with Git Bash).
# `sh build.sh assets` only copies the sprites in, for `npm start`.
set -e
cd "$(dirname "$0")"
rm -rf assets && mkdir assets && cp -R ../assets/pets ../assets/workers assets/
[ "$1" = assets ] && exit 0
rm -rf dist
npx electron-builder --win --publish never
ls dist/ClaudePets-Setup.exe dist/ClaudePets-windows-x64.zip

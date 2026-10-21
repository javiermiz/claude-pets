#!/bin/sh
# Builds a universal ClaudePets.app into dist/ and zips it for a GitHub release.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir dist
APP="$PWD/dist/ClaudePets.app" NO_LAUNCH=1 ./build.sh
ditto -c -k --keepParent dist/ClaudePets.app dist/ClaudePets.zip
echo "dist/ClaudePets.zip"

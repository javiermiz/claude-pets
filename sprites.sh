#!/bin/sh
# Regenerates assets/ from pets.px.js. Only needed when you change the art.
# Needs pxl (the pxl-pixel-art Claude Code skill; point $PXL at it) and Python with Pillow.
set -e
cd "$(dirname "$0")"
PXL=${PXL:-"node $HOME/.claude/skills/pxl-pixel-art/bin/pxl.js"}
$PXL build pets.px.js >/dev/null
rm -rf assets/pets assets/workers && mkdir -p assets/pets assets/workers
for f in out/anims/*.png; do case $(basename "$f") in worker_*|desk_side*) cp "$f" assets/workers/ ;; *) cp "$f" assets/pets/ ;; esac; done
cp out/sprites/chair_side.png out/sprites/meeting_table.png assets/workers/

# icon: pixel-perfect upscale of out/scenes/icon.png with rounded corners
python3 - <<'PY'
import os, subprocess, tempfile
from PIL import Image, ImageDraw
src = Image.open("out/scenes/icon.png").convert("RGBA")
d = tempfile.mkdtemp() + "/AppIcon.iconset"; os.makedirs(d)
for px in (16, 32, 64, 128, 256, 512, 1024):
    im = src.resize((px, px), Image.NEAREST)
    mask = Image.new("L", (px, px), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, px - 1, px - 1), radius=px // 5, fill=255)
    im.putalpha(mask)
    if px <= 512: im.save(f"{d}/icon_{px}x{px}.png")
    if px >= 32: im.save(f"{d}/icon_{px // 2}x{px // 2}@2x.png")
subprocess.run(["iconutil", "-c", "icns", d, "-o", "assets/AppIcon.icns"], check=True)
PY
echo "assets/ updated; run ./build.sh"

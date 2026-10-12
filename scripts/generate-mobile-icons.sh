#!/usr/bin/env bash
# Regenerate mobile launcher/splash PNGs from ui/public/brand-mark.svg
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/app/assets/images"
SVG="$ROOT/ui/public/brand-mark.svg"
[ -f "$SVG" ] || { echo "Missing $SVG" >&2; exit 1; }

rsvg-convert -w 640 "$SVG" -o /tmp/seekers-mark-640.png
magick -size 1024x1024 xc:none /tmp/seekers-mark-640.png -gravity center -composite "$ASSETS/android-icon-foreground.png"
magick -size 1024x1024 xc:'#2b2b2b' /tmp/seekers-mark-640.png -gravity center -composite "$ASSETS/icon.png"
magick -size 1024x1024 xc:'#2b2b2b' "$ASSETS/android-icon-background.png"
magick "$ASSETS/android-icon-foreground.png" -colorspace Gray -threshold 45% "$ASSETS/android-icon-monochrome.png"
rsvg-convert -w 200 "$SVG" -o "$ASSETS/splash-icon.png"
magick "$ASSETS/icon.png" -resize 48x48 "$ASSETS/favicon.png"
echo "Updated icons in $ASSETS"

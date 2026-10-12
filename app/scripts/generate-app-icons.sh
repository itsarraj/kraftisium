#!/usr/bin/env bash
# Regenerate every app/web icon from the single brand mark (ui/public/logo.svg).
# The mark is trimmed, scaled, and centered on each canvas so padding is consistent.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGO="$ROOT/ui/public/logo.svg"
MOBILE="$ROOT/app/assets/images"
WEB="$ROOT/ui/public"
BG="#2b2b2b"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

command -v rsvg-convert >/dev/null || { echo "Install librsvg (rsvg-convert)" >&2; exit 1; }
command -v magick >/dev/null || { echo "Install ImageMagick (magick)" >&2; exit 1; }

# Tight, high-res mark on transparency — every output derives from this.
rsvg-convert -h 3000 "$LOGO" -o "$TMP/full.png"
magick "$TMP/full.png" -trim +repage "$TMP/mark.png"

# icon <canvas px> <mark height %> <background|none> <out>
# Opaque backgrounds are flattened: store icons must not carry an alpha channel.
icon() {
  magick "$TMP/mark.png" -resize "x$(( $1 * $2 / 100 ))" \
    -background "$3" -gravity center -extent "$1x$1" \
    $([ "$3" = none ] || echo -flatten -alpha off) "$4"
}

# Mobile: iOS/Play store icon is opaque (no alpha allowed).
icon 1024 50 "$BG" "$MOBILE/icon.png"
magick -size 1024x1024 "xc:$BG" -colorspace sRGB -define png:color-type=2 "$MOBILE/android-icon-background.png"
# Adaptive foreground stays inside the 66% safe zone Android masks to.
icon 1024 40 none "$MOBILE/android-icon-foreground.png"
icon 1024 40 none "$TMP/mono.png"
magick "$TMP/mono.png" -fill white -colorize 100 "$MOBILE/android-icon-monochrome.png"
icon 1024 55 none "$MOBILE/splash-icon.png"
icon 48 60 "$BG" "$MOBILE/favicon.png"
magick "$TMP/mark.png" -resize x580 "$MOBILE/brand-mark.png"

# Web rasters (same mark, so browsers and the app never drift).
icon 48 60 "$BG" "$WEB/favicon.png"
icon 192 50 "$BG" "$WEB/icon-192.png"
icon 512 50 "$BG" "$WEB/icon-512.png"
icon 180 50 "$BG" "$WEB/apple-touch-icon.png"

echo "Updated icons in $MOBILE and $WEB"

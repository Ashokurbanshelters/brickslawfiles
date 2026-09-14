#!/usr/bin/env bash
# ==========================================================================
# Image build for Bricks Law LLP
#   ./scripts/build-images.sh
# Reads full-resolution sources from assets/img/raw/ and writes responsive
# derivatives (jpg + webp at 1400 / 900 / 640 px) into assets/img/.
# Requires ImageMagick (`convert`). Re-run after adding or replacing a source.
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/img/raw"
OUT="$ROOT/assets/img"
WIDTHS=(1400 900 640)
QUALITY=80
WEBP_QUALITY=76

mkdir -p "$OUT"

for src in "$SRC"/*.jpg "$SRC"/*.png; do
  [ -e "$src" ] || continue
  name="$(basename "${src%.*}")"

  for w in "${WIDTHS[@]}"; do
    convert "$src" \
      -resize "${w}x${w}>" \
      -strip \
      -interlace Plane \
      -quality "$QUALITY" \
      "$OUT/$name-$w.jpg"
    convert "$src" \
      -resize "${w}x${w}>" \
      -strip \
      -quality "$WEBP_QUALITY" \
      "$OUT/$name-$w.webp"
  done

  # Pages always reference an explicit width (…-1400/-900/-640), so no alias
  # copy is written: it would only duplicate bytes in the repository.

  echo "built  $name  (${WIDTHS[*]} @ jpg q$QUALITY / webp q$WEBP_QUALITY)"
done

# Social card: 1200x630, centre-cropped from the hero source
convert "$SRC/hero-office.jpg" -resize 1200x630^ -gravity center -extent 1200x630 \
  -strip -interlace Plane -quality 82 "$OUT/og-cover.jpg"

echo "done."

#!/bin/sh
# Rebuild the transparent fox loops from the opaque idle mp4 (light background).
# The fox stands on the landing page's NIGHT background (components/landing/night/
# NightFox.tsx), so the cut must leave no light fringe.
#   public/landing/hero-fox-idle-hevc.mp4    HEVC+alpha (Safari)
#   public/landing/hero-fox-idle.webm        VP9+alpha (Chromium, Firefox)
#   public/landing/hero-fox-idle-poster.webp first frame, the still shown before/without the loop
# Needs ffmpeg (libvpx-vp9 + hevc_videotoolbox, i.e. macOS) and ImageMagick 7.
# Usage: scripts/key-hero-fox.sh [public/landing/hero-fox-idle.mp4]
set -eu
src="${1:-public/landing/hero-fox-idle.mp4}"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
mkdir -p "$work/in" "$work/out"
ffmpeg -v error -i "$src" "$work/in/%04d.png"

# Per frame:
# 1) flood-fill the edge-connected light background (can't reach enclosed shirt/eyes/teeth)
# 2) within 14px of that background, also drop neutral light-grey pixels (the baked grey outline and
#    background pockets between hair strands); the fox's light areas are all warm (chroma >= 14)
# 3) anywhere: drop >=20px near-white neutral blobs = enclosed background gaps (arm/torso);
#    eye highlights are not neutral-bright enough to match
# 4) repeat (2) around EVERY transparent area, not just the outer background: the pockets
#    found in (3) keep a ring of antialiased light grey that reads as a white speck on dark
# 5) the gap between the right hand, the jacket hem and the tail: studio background that video
#    compression tinted with its orange neighbours (chroma 4-8%), so (2)-(4) miss it. Clip-specific
#    box; inside it the suit is too dark and the cuff, fur and tail too colourful (>= 10%) to match
# 6) erode 2.2px + 0.8px blur: on a dark page even a 1px rim of the old background glows
key_frame() {
  in="$1"; out="$2"; t="$out.tmp"
  magick "$in" -alpha set -bordercolor 'rgb(247,247,245)' -border 1 -fuzz 5% -fill none -draw "color 0,0 floodfill" -shave 1x1 -alpha extract $t.flood.png
  magick "$in" \( -clone 0 -separate -evaluate-sequence Max \) \( -clone 0 -separate -evaluate-sequence Min \) -delete 0 -compose Minus_Src -composite $t.chroma.png
  magick "$in" -separate -evaluate-sequence Min $t.min.png
  magick $t.chroma.png -threshold 4.3% -negate $t.neutral.png
  magick $t.min.png -threshold 62% $t.light.png
  magick $t.flood.png -negate -morphology Dilate Disk:14 $t.band.png
  magick $t.neutral.png $t.light.png $t.band.png -compose Multiply -background white -flatten $t.kill1.png
  magick $t.min.png -threshold 93.3% \( $t.chroma.png -threshold 4.7% -negate \) -compose Multiply -composite $t.bright.png
  magick $t.bright.png -define connected-components:area-threshold=20 -define connected-components:mean-color=true -connected-components 8 -threshold 50% $t.kill2.png
  magick $t.flood.png \( $t.kill1.png -negate \) \( $t.kill2.png -negate \) -compose Multiply -background white -flatten $t.alpha0.png
  magick $t.alpha0.png -threshold 50% -negate -morphology Dilate Disk:10 $t.band2.png
  magick $t.neutral.png $t.light.png $t.band2.png -compose Multiply -background white -flatten $t.kill3.png
  magick $t.min.png -threshold 68% \( $t.chroma.png -threshold 9% -negate \) -compose Multiply -composite \
    \( "$in" -alpha off -fill black -colorize 100 -fill white -draw "rectangle 420,805 520,925" \) -compose Multiply -composite $t.kill4.png
  magick $t.alpha0.png \( $t.kill3.png -negate \) \( $t.kill4.png -negate \) -compose Multiply -background white -flatten -morphology Erode Disk:2.2 -blur 0x0.8 $t.alpha.png
  magick "$in" $t.alpha.png -alpha off -compose CopyOpacity -composite "$out"
  rm -f $t.*.png
}
for f in "$work"/in/*.png; do key_frame "$f" "$work/out/$(basename "$f")" & 
  [ "$(jobs -r | wc -l)" -ge 8 ] && wait
done; wait

ffmpeg -v error -y -framerate 24 -i "$work/out/%04d.png" -c:v libvpx-vp9 -pix_fmt yuva420p \
  -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -an public/landing/hero-fox-idle.webm
ffmpeg -v error -y -framerate 24 -i "$work/out/%04d.png" -c:v hevc_videotoolbox -pix_fmt bgra \
  -alpha_quality 0.75 -b:v 700k -tag:v hvc1 -an -movflags +faststart public/landing/hero-fox-idle-hevc.mp4
magick "$work/out/0001.png" -quality 86 -define webp:alpha-quality=95 public/landing/hero-fox-idle-poster.webp
ls -l public/landing/hero-fox-idle.webm public/landing/hero-fox-idle-hevc.mp4 public/landing/hero-fox-idle-poster.webp

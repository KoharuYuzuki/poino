set -eu

CURRENT_DIR=$(cd $(dirname $0); pwd)
BUILD_DIR="$CURRENT_DIR/build"

ICON_FILE="$CURRENT_DIR/images/icon/icon.png"
ICON_DIR="$BUILD_DIR/icon.iconset"

mkdir -p "$ICON_DIR"
convert -resize 16x16!   "$ICON_FILE" "$ICON_DIR/icon_16x16.png"
convert -resize 32x32!   "$ICON_FILE" "$ICON_DIR/icon_16x16@2x.png"
convert -resize 32x32!   "$ICON_FILE" "$ICON_DIR/icon_32x32.png"
convert -resize 64x64!   "$ICON_FILE" "$ICON_DIR/icon_32x32@2x.png"
convert -resize 128x128! "$ICON_FILE" "$ICON_DIR/icon_128x128.png"
convert -resize 256x256! "$ICON_FILE" "$ICON_DIR/icon_128x128@2x.png"
convert -resize 256x256! "$ICON_FILE" "$ICON_DIR/icon_256x256.png"
convert -resize 512x512! "$ICON_FILE" "$ICON_DIR/icon_256x256@2x.png"
convert -resize 512x512! "$ICON_FILE" "$ICON_DIR/icon_512x512.png"
iconutil -c icns "$ICON_DIR" -o "$BUILD_DIR/icon.icns"

convert "$ICON_FILE" -define icon:auto-resize "$BUILD_DIR/icon.ico"

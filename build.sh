set -eu

CURRENT_DIR=$(cd $(dirname $0); pwd)
DIST_DIR="$CURRENT_DIR/dist"
BUILD_DIR="$CURRENT_DIR/build"
RENDERER_DIST_DIR="$CURRENT_DIR/renderer/dist"

rm -rf "$DIST_DIR"
rm -rf "$BUILD_DIR"
rm -rf "$RENDERER_DIST_DIR"

npm run build --prefix "$CURRENT_DIR"
cp -f "$CURRENT_DIR/openjtalk/openjtalk.wasm" "$BUILD_DIR/openjtalk/openjtalk.wasm"

"$CURRENT_DIR/convert_icon.sh"

export CSC_IDENTITY_AUTO_DISCOVERY=false

npx electron-builder --mac --arm64 --x64
npx electron-builder --win --arm64 --x64

VERSION=$(node -p "require('./package.json').version")

mv -f "$DIST_DIR/poino-mac-arm64.zip" "$DIST_DIR/poino-v$VERSION-mac-AppleSilicon.zip"
mv -f "$DIST_DIR/poino-mac-x64.zip"   "$DIST_DIR/poino-v$VERSION-mac-Intel.zip"

mv -f "$DIST_DIR/poino-win-arm64.zip" "$DIST_DIR/poino-v$VERSION-win-arm64.zip"
mv -f "$DIST_DIR/poino-win-x64.zip"   "$DIST_DIR/poino-v$VERSION-win-x64.zip"

rm -f "$DIST_DIR"/*.blockmap
rm -rf "$DIST_DIR"/*[^zip]

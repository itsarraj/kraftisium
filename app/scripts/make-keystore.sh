#!/usr/bin/env bash
# Generates the Play upload keystore for this app and prints the env exports
# that android/app/build.gradle reads. Run once; back the .jks file up somewhere
# safe — losing it means you cannot update the app on Play.
set -euo pipefail

APP_NAME="${APP_NAME:-$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)")}"
OUT_DIR="${1:-$HOME/.${APP_NAME}}"
KS="$OUT_DIR/${APP_NAME}-upload.jks"
ALIAS="${APP_NAME}-upload"

mkdir -p "$OUT_DIR"
if [[ -f "$KS" ]]; then
  echo "Keystore already exists at $KS — not overwriting."
  exit 0
fi

read -r -s -p "Keystore/key password (min 6 chars): " PASS; echo
keytool -genkeypair -v \
  -keystore "$KS" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=${APP_NAME}, OU=Mobile, O=Kraftisium, L=Mumbai, ST=MH, C=IN"

UPPER_APP="$(echo "${APP_NAME}" | tr '[:lower:]-' '[:upper:]_')"

cat <<EOF

Created $KS

Add to ~/.gradle/gradle.properties (or export as env vars before ./gradlew):
${UPPER_APP}_UPLOAD_STORE_FILE=$KS
${UPPER_APP}_UPLOAD_STORE_PASSWORD=<password>
${UPPER_APP}_UPLOAD_KEY_ALIAS=$ALIAS
${UPPER_APP}_UPLOAD_KEY_PASSWORD=<password>

Then: bun run android:bundle   # -> android/app/build/outputs/bundle/release/app-release.aab
EOF

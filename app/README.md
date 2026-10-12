# Kraftisium (Android / Expo)

Expo Router app with a custom development build (`expo-dev-client`).  
Production API: `https://api.kraftisium.xyz`

Package manager: Bun (`bun.lock`). Use `bun run <script>` — same names work with `npm run` if needed.

Guides:

- Phone test + EAS: [../docs/mobile-android-build.md](../docs/mobile-android-build.md)
- Local builds (no EAS): [../docs/mobile-android-local-build.md](../docs/mobile-android-local-build.md)

## Quick start — test on your phone (live API)

```bash
cd app
bun install
cp env.example .env

bunx expo prebuild --clean
bun run android:device:production-api

bun run dev:phone:production-api
```

Metro should log:

```text
[Kraftisium] BFF_API_URL = https://api.kraftisium.xyz
```

## Release build (local, no EAS)

```bash
bunx expo prebuild --clean
export EXPO_PUBLIC_BFF_API_URL=https://api.kraftisium.xyz
export EXPO_PUBLIC_BFF_API_VERSION=v1
cd android && ./gradlew :app:assembleRelease   # APK
# or: ./gradlew :app:bundleRelease             # AAB — configure signing first
```

See [../docs/mobile-android-local-build.md](../docs/mobile-android-local-build.md) for signing and Play upload.

## Google Play (EAS, optional)

```bash
bun add -g eas-cli
eas login
bun run eas:android:preview
bun run eas:android:production
```

## Local BFF only (optional)

```bash
cp ../docs/env/mobile.local.env .env
bun run dev:android-tunnel-adb
```

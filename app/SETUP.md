# Kraftisium mobile app — development setup

Phone testing + Google Play (production API): **[../docs/mobile-android-build.md](../docs/mobile-android-build.md)**  
Branding / icons: **[../docs/mobile-branding-and-build.md](../docs/mobile-branding-and-build.md)**

Default API: `https://api.kraftisium.xyz` — use `npm run dev:phone:production-api` on a physical device.

This document describes Metro, the development build, optional local BFF via adb, and deep troubleshooting.

Official references:

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [ADB reverse](https://developer.android.com/studio/command-line/adb#reverse)

---

## 1. What you are running

| Piece | Role |
|--------|------|
| **Metro** (default port **8081**) | Bundles JavaScript for the app; the dev client loads the bundle from here. |
| **Development build** (`expo run:android`) | A native APK with `expo-dev-client` — not Expo Go. Required for native modules and this project’s workflow. |
| **BFF API** (default **http://localhost:8000**) | Merged backend: auth, jobs, resumes, subscriptions via `services/*Api.ts` → `constants/config.ts`. |

Defaults assume the merged backend listens on your **development machine**. On a **phone**, `localhost` means **the phone itself**, not your PC — so you must use one of the networking modes in [section 5](#5-connecting-the-phone-to-your-backends).

---

## 2. Prerequisites

- **Node.js** (LTS) and npm.
- **Android SDK** / **platform-tools** (`adb` on your `PATH`). Typical install: Android Studio.
- **USB debugging** enabled on the phone; accept the RSA prompt when plugging in.
- For a **development build**: run `npx expo run:android --device` at least once so the dev client APK is installed (see [section 8](#8-url-schemes-and-rebuilding-the-dev-client)).

Check the device:

```bash
adb devices
```

You should see `device`, not `unauthorized`.

This project depends on **`expo-dev-client`** (see `package.json` and the **`expo-dev-client`** entry under `plugins` in `app.config.js`). Use a **development build** you built from this repo (`expo run:android`). Opening the same JavaScript in **Expo Go** or an **outdated debug APK** (from before a dependency was added) often breaks native modules such as **AsyncStorage**.

---

## 3. Install and basic commands

From the `app` directory:

```bash
cd app
npm install
```

| Command | When to use |
|---------|----------------|
| `npm run dev:android-tunnel-adb` | **Recommended** for a real phone when you want **Expo tunnel** (Metro reachable without same LAN) **and** APIs on your PC via **USB** (see below). |
| `npm run dev:android-adb` | USB + **LAN** Metro (`--dev-client`); same API forwarding as above. |
| `npm run dev:android-adb:clear` | Same as above but clears Metro cache. |
| `npx expo start --dev-client` | Generic start; you must configure `.env` / networking yourself. |
| `npx expo run:android --device` | (Re)build and install the **native** dev client APK. |
| `npm run android:clean` | Gradle `clean` (use before a full rebuild if native deps changed). |
| `npm run android:rebuild` | `clean` then `expo run:android --device` (pick device when prompted). |

---

## 4. Babel, NativeWind, and Expo Router

### 4.1 `nativewind/babel` must be a **preset**, not a plugin

`nativewind/babel` resolves to `react-native-css-interop/babel`, which returns an object shaped like **`{ plugins: [...] }`**. That shape is a **Babel preset**, not a single plugin. Listing it under `plugins` in `babel.config.js` causes:

```text
.plugins is not a valid Plugin property
```

**Current `babel.config.js` pattern:**

- **Presets:** `babel-preset-expo` (with `jsxImportSource: 'nativewind'`), then `nativewind/babel`.
- **Plugins:** only `react-native-reanimated/plugin` (must stay **last**).

### 4.2 Do not add `expo-router/babel` manually

From SDK 50+, **Expo Router** is integrated via **`babel-preset-expo`**. The old `expo-router/babel` entry is deprecated and should be removed.

---

## 5. Connecting the phone to your backends

Configuration lives in **`constants/config.ts`** and is driven by **`EXPO_PUBLIC_*`** variables (see **`env.example`**). Expo inlines these at **bundle time** — **restart Metro** after changing `.env`.

### 5.1 Why `localhost` breaks on a device

- On your **PC**, `http://localhost:8000` is the BFF.
- On the **phone**, `http://localhost:8000` is the phone — requests fail with **`Network request failed`**.

### 5.2 Why Expo **tunnel** does not fix APIs by itself

With **`expo start --tunnel`**, Metro is exposed (e.g. `*.exp.direct`). That tunnel does **not** automatically expose port **8000**. Rewriting API base URLs to the **tunnel hostname** would point at the wrong service. Therefore:

- **`hostUri`** is only used to rewrite `localhost` when it looks like a **private LAN IPv4** (`10.x`, `192.168.x`, `172.16–31.x`).
- For tunnel hostnames (`exp.direct`, ngrok, etc.), the app does **not** substitute the tunnel host for your APIs.

### 5.3 Option A — USB port forwarding (**adb reverse**) + tunnel (recommended)

This keeps API URLs as **`http://localhost:8000`** in JS; **ADB** forwards that port from the phone to your PC.

1. Plug in the phone; `adb devices` shows `device`.
2. Start Metro with the script that **runs reverse + sets transport**:

   ```bash
   npm run dev:android-tunnel-adb
   ```

   This runs:

   - `adb reverse tcp:8081 tcp:8081` — Metro
   - `adb reverse tcp:8000 tcp:8000` — merged backend  
   - `EXPO_PUBLIC_DEV_TRANSPORT=adb` so `localhost` stays `localhost` (adb reverse makes it reach your PC)

3. Ensure the merged backend is listening on the **PC** (typically `127.0.0.1` or `0.0.0.0` on port `8000`).

If `adb reverse` fails (no device), the script exits before starting Metro — fix USB/adb first.

**Manual reverse** (if you do not use the script):

```bash
npm run android:reverse:dev
```

Re-run after **adb restart** or **replugging** the device; reversals are not always permanent.

### 5.4 Option B — Same Wi‑Fi, LAN IP

1. Set your PC’s IPv4 on the LAN, e.g.:

   ```bash
   # in .env
   EXPO_PUBLIC_DEV_API_HOST=192.168.1.50
   ```

2. Start Metro with LAN, e.g. `expo start --dev-client --lan` (or `npm run dev:android-adb` without tunnel).

3. Ensure the PC firewall allows inbound **8000** from the LAN.

4. Backends should listen on **`0.0.0.0`** (or at least an interface reachable from the phone), not only `127.0.0.1`, if you are **not** using adb reverse.

### 5.5 Option C — HTTPS tunnel per backend

Expose the merged BFF with **cloudflared**, **ngrok**, or similar:

```bash
EXPO_PUBLIC_BFF_API_URL=https://your-bff-tunnel.example
```

No adb reverse required for APIs; you still need a way for the dev client to reach Metro (tunnel or LAN).

### 5.6 Android cleartext HTTP

Debug builds allow **`http://`** for LAN IPs or localhost-via-adb. Release builds are configured for HTTPS-only networking.

---

## 6. Environment variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_BFF_API_URL` | Merged BFF base URL (auth + jobs + resumes; default dev `http://localhost:8000`). |
| `EXPO_PUBLIC_BFF_API_VERSION` | API path version (default `v1`). |
| `EXPO_PUBLIC_DEV_TRANSPORT=adb` | Keep `localhost` in URLs; use with **adb reverse** for device → PC. |
| `EXPO_PUBLIC_DEV_API_HOST` | Force rewrite of `localhost` / `127.0.0.1` to this host (e.g. `192.168.1.50`). |
| `EXPO_PUBLIC_ANDROID_EMULATOR_HOST` | Android emulator host for the dev machine (defaults to `10.0.2.2`). |

Copy **`env.example`** to **`.env`** and edit. Restart Metro after changes.

---

## 7. npm scripts (Android-focused)

| Script | What it does |
|--------|----------------|
| `android:reverse:dev` | `adb reverse` for **8081** and **8000**. |
| `android:reverse` | Only **8081** (Metro). |
| `android:reverse:all` | **8081** + legacy Expo ports **19000–19002**. |
| `android:devices` | `adb devices`. |
| `android:logcat` | Filtered logcat for RN / Expo. |
| `dev:android-adb` | `android:reverse:dev` then `EXPO_PUBLIC_DEV_TRANSPORT=adb expo start --dev-client`. |
| `dev:android-tunnel-adb` | Same + **`--tunnel`** for Metro. |
| `dev:android-tunnel-ad` | Alias for **`dev:android-tunnel-adb`** (typo-friendly). |

---

## 8. URL schemes and rebuilding the dev client

Expo CLI builds a URL like:

```text
<scheme>://expo-development-client/?url=<encoded-metro-url>
```

The **scheme** is resolved from **native** Android config (see Expo’s `getOptionalDevClientSchemeAsync`). This project registers multiple schemes on `MainActivity` (see `app.config.js` `scheme`) so old and new installs stay compatible:

- **`kraftisium`** (current)
- **`mobileappminimal`** (legacy; longer name so Expo CLI tends to pick it for **launch** when both exist)
- **`jobsearchwebandroidapp`** (legacy)

After changing **`AndroidManifest.xml`** intent filters or **`app.config.js` `scheme`**, reinstall the dev client:

```bash
npx expo run:android --device
```

If you see **`unable to resolve Intent`** for `kraftisium://...`, the installed APK does not match the manifest — rebuild and install.

**Display name** is **Kraftisium** (`app.config.js` `name`). The Android **applicationId** / iOS **bundleIdentifier** is `xyz.kraftisium.jobs`.

---

## 9. Troubleshooting

### `Network request failed` (fetch / XHR)

- **Device + `localhost`:** Use [5.3](#53-option-a--usb-port-forwarding-adb-reverse--tunnel-recommended) or [5.4](#54-option-b--same-wi-fi-lan-ip) or [5.5](#55-option-c--https-tunnel-per-backend).
- **Tunnel + APIs:** Do not expect the Metro tunnel hostname to serve port 8000; use adb reverse or tunneled API URLs.
- **Backend not listening:** Confirm the merged backend is listening on **8000** on the PC (`curl` from the PC).

### `Activity not started, unable to resolve Intent` (dev client URL)

- Reinstall dev build: `npx expo run:android --device`.
- Ensure **`AndroidManifest.xml`** includes the scheme Expo uses (this repo lists `kraftisium`, `mobileappminimal`, and `jobsearchwebandroidapp` — see `app.config.js` `scheme`).

### Metro: “Port 8081 is running…”

- Stop the other process or run `fuser -k 8081/tcp` (Linux) before starting Expo.

### `INSTALL_FAILED_USER_RESTRICTED` (APK install)

- Phone-side: allow install via USB / unknown sources, disable restrictive profiles, accept install prompts (common on MIUI/OPPO/Vivo).

### Babel: `.plugins is not a valid Plugin property`

- Ensure **`nativewind/babel`** is under **`presets`**, not **`plugins`**, and **`expo-router/babel`** is removed (see [section 4](#4-babel-nativewind-and-expo-router)).

### `adb reverse` fails

- Single device/emulator recommended; for multiple devices use `adb -s <serial> reverse ...`.

### `[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null`

The JS library is loaded, but the **native** AsyncStorage module is not in the running app.

1. **Reinstall a fresh development build** (most common fix after adding or upgrading native deps):

   ```bash
   npm run android:rebuild
   ```

   Or manually: uninstall **Kraftisium** (`xyz.kraftisium.jobs`) from the phone, then `npx expo run:android --device`.

2. **Confirm you are not using Expo Go** for this workflow. This app targets a **custom dev client** with `expo-dev-client` and community native modules; always open the build installed by `expo run:android`.

3. **Clear Metro** after dependency changes: `npx expo start --dev-client --clear`.

4. **Verify the dependency** is direct: `@react-native-async-storage/async-storage` must appear in **`package.json`** (not only nested under another package). Autolinking only sees direct dependencies.

5. Regenerate native autolinking if needed: from `android/`, run `./gradlew :app:generateAutolinkingPackageList`, then rebuild the app.

### Expo Router: “Route … is missing the required default export” (many files at once)

Your route files **do** export components; this warning often appears when a **dependency of the layout throws while the bundle is loading** — for example **`AuthContext` → `auth-storage` → AsyncStorage** when **`NativeModule: AsyncStorage is null`**. Fix the underlying native error (rebuild the dev client; see **`[@RNC/AsyncStorage]`** in this section); the route warnings usually disappear afterward.

### `Cannot find native module 'ExpoDocumentPicker'` (or other `expo-*` native modules)

Same cause as AsyncStorage: the **APK on the device** was built **without** that native module (old build, different project, or Expo Go). **Rebuild and reinstall** the development client from this repo:

```bash
npx expo run:android --device
```

Uninstall the old app first if the install is flaky.

---

## 10. Production and security notes

- **`EXPO_PUBLIC_*`** values are embedded in the client bundle — **never** put secrets there.
- Replace **`usesCleartextTraffic`** with a stricter network security config when you standardize on **HTTPS**.
- Point **`EXPO_PUBLIC_BFF_API_URL`** at your real staging/production host via EAS env or CI, not dev defaults.

---

## 11. File map

| File | Relevance |
|------|-----------|
| `constants/config.ts` | API base URLs, dev host rewrite, tunnel warning. |
| `babel.config.js` | Expo + NativeWind + Reanimated. |
| `app.config.js` | App name, slug, schemes, plugins (`expo-dev-client`, …), Android cleartext via `expo-build-properties`. |
| `package.json` | Includes `expo-dev-client` and `@react-native-async-storage/async-storage`. |
| `android/app/src/main/AndroidManifest.xml` | Deep link schemes, cleartext. |
| `android/app/src/main/res/values/strings.xml` | Launcher label **Kraftisium**. |
| `env.example` | Template for `.env`. |

For a short variable cheat sheet, keep **`env.example`** next to this file.

# Android builds — short reference

Full guide: [../docs/mobile-android-build.md](../docs/mobile-android-build.md)

## Phone testing (production API)

```bash
cd app
cp env.example .env
npm run dev:phone:production-api
```

## EAS

```bash
npm run eas:android:preview
npm run eas:android:production
```

API URL for all EAS profiles: `https://api.kraftisium.xyz` (see `eas.json`).

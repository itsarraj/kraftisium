# Play Store signing (Kraftisium)

## Two different keys (do not mix them up)

| Key | Who holds private key | What it signs | When it matters |
|---|---|---|---|
| Upload key | You / EAS | The `.aab` you upload | Play rejects upload if SHA1 mismatches |
| App signing key | Google Play | APKs users install | App Links, API providers, device installs |

Changing the **app signing key** in Play Console does **not** require an EAS rebuild.
Google re-signs distribution APKs with the app signing key after it accepts your AAB.

The "wrong key" upload error is always about the **upload key**, not the app signing key.

## What is in this folder

```
play-store/
  certificates/          # PUBLIC certs from Play Console (safe to keep)
    deployment_cert.*      previous / deployment cert (SHA256 42:FF:34:...)
    hybrid_classical_cert.*  current classical app signing key (SHA256 99:45:58:...)
    hybrid_pqc_cert.*        post-quantum app signing key (SHA256 08:EB:3D:...)
  upload-key/            # PUBLIC upload cert exported from EAS (when present)
  assetlinks.json        # for https://kraftisium.xyz/.well-known/assetlinks.json
  fingerprints.md        # all SHA1 / SHA256 recorded
  README.md              # this file
```

Private keystores (`.jks`) are gitignored. Keep EAS remote credentials as source of truth.
Download a local backup occasionally with:

```bash
cd app
eas credentials -p android
# production → Keystore → Download existing keystore
# store the .jks OFF the repo (password manager / encrypted drive)
```

## Current app identity in this repo

- Display name: Kraftisium
- Android package / iOS bundle: `xyz.kraftisium.jobs`
- EAS project: `@itsarraj/kraftisium` (`70a07986-dbd5-445b-9ee3-929c0125d4c8`)

## Play Console listing you linked

The key management page Digital Asset Links snippet still shows:

- package: `xyz.seeker.app`
- SHA256: `42:FF:34:B2:...` (matches `deployment_cert`, not the new classical key)

That listing is **not** `xyz.kraftisium.jobs`. You cannot upload a `xyz.kraftisium.jobs` AAB to a `xyz.seeker.app` app (and that listing still carries the old upload-key expectation `1B:C8:99:...` unless Google has fully cleared it).

### Correct path (recommended)

1. Play Console → Create app (new entry).
2. Package name must be `xyz.kraftisium.jobs`.
3. Upload AAB from EAS build for `xyz.kraftisium.jobs` (upload key SHA1 `8F:A0:F2:...`).
4. Accept Play App Signing defaults (Google manages app signing key).
5. Put `assetlinks.json` on the website (see below).

### Wrong path

Do not keep uploading to the old `xyz.seeker.app` listing while the repo package is `xyz.kraftisium.jobs`.

## Digital Asset Links

Host this at `https://kraftisium.xyz/.well-known/assetlinks.json` after the Play app for `xyz.kraftisium.jobs` is live.

Use the **in-use classical app signing** SHA256 (`hybrid_classical_cert`):

`99:45:58:7F:F8:97:6F:D4:56:39:F8:95:19:60:1D:CD:AD:35:AE:4D:69:B8:86:56:A4:41:9C:58:D2:88:95:60`

See `assetlinks.json` in this folder.

If Play Console still shows the old snippet with `42:FF:34:...`, refresh App signing after the new key is active, or copy fingerprints from `fingerprints.md` → `hybrid_classical_cert`.

## After you change app signing key again

1. Re-download certificates.zip from Play Console → App signing.
2. Replace files under `certificates/`.
3. Update `fingerprints.md` and `assetlinks.json` SHA256.
4. Do **not** rebuild on EAS just because the app signing key changed.
5. Only rebuild if the **upload** keystore on EAS changed.

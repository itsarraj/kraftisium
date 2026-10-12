# Upload key (EAS)

This is the key that signs the `.aab` before Play accepts it.

## Current EAS upload key for `xyz.kraftisium.jobs`

From the production build that generated a new keystore:

- SHA1: `8F:A0:F2:B0:B6:20:20:41:82:22:A4:6C:06:7E:F2:6C:F0:59:B8:59`

Export the public cert (no private key) after downloading the EAS `.jks`:

```bash
cd app
eas credentials -p android
# Download existing keystore for xyz.kraftisium.jobs

keytool -export -rfc \
  -keystore YOUR.jks \
  -alias YOUR_ALIAS \
  -file play-store/upload-key/upload_cert.pem
```

Register that PEM with API providers (Firebase, Google Sign-In, Maps) if they ask for the upload or signing cert. For App Links / Digital Asset Links, use the **app signing** cert SHA256 in `../assetlinks.json`, not this upload key.

## Abandoned keys (do not use)

| SHA1 | Notes |
|---|---|
| `1B:C8:99:46:98:BF:73:57:F5:70:B4:55:D4:54:50:C0:81:C7:3F:73` | Expected by old Play listing; private key not on this machine |
| `D0:67:20:AE:36:36:06:D2:0F:A9:00:C5:90:98:9F:06:26:7B:3A:78` | Old EAS keystore for `xyz.seeker.app` (`@itsarraj__kraftisium.jks`) |

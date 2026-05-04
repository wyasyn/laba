# Google Sign-In (Android) — Clerk + Expo

This app uses `@clerk/expo/google` (`useSignInWithGoogle`) with **Android Credential Manager**. Google must trust your app’s **package name + signing certificate** before it returns an ID token; Clerk must register the same app under **Native Applications**.

## Package name

`com.yasinwalum.laba` (see `app.json` → `expo.android.package`)

## Debug keystore fingerprints (this machine)

Extracted with:

```bash
keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey -storepass android -keypass android
```

| Use | Fingerprint |
|-----|-------------|
| **SHA-1** (Google Cloud Console → Android OAuth client) | `76:92:80:42:37:52:C8:00:F3:83:A6:3B:74:3F:26:23:0A:F2:4F:DB` |
| **SHA-256** (Clerk Dashboard → Native Applications) | `F8:9C:C9:F3:13:7C:B6:46:D5:DE:3E:45:E4:A9:0A:DE:B4:7F:39:3F:66:5A:EA:E4:BD:F8:27:7C:9B:12:39:C1` |

> **Production / EAS:** use the upload keystore from EAS (not the debug keystore). Run `eas credentials -p android`, open your keystore, and copy **SHA-1** and **SHA-256** for the release signing key. Add a **second** Android OAuth client in Google (same package, release SHA-1) and register the release SHA-256 in Clerk Native Applications.

## Checklist — Google Cloud Console

Same project as your **Web** OAuth client (the one whose client ID is `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID`).

1. APIs & Services → **Credentials** → **Create credentials** → **OAuth client ID**
2. Application type: **Android**
3. Package name: `com.yasinwalum.laba`
4. SHA-1: paste **debug** SHA-1 above (and create another Android client for **release** SHA-1 when you ship)
5. Create → copy the **Android client ID** (ends with `.apps.googleusercontent.com`) into `.env` as `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID`

Your **Web** client must still list Clerk’s **Authorized redirect URI** from the Clerk Dashboard (SSO → Google). That is unchanged.

## Checklist — Clerk Dashboard

1. [Native Applications](https://dashboard.clerk.com/~/native-applications) → **Add** → **Android**
2. Namespace: e.g. `laba`
3. Package name: `com.yasinwalum.laba`
4. Certificate fingerprint: **SHA-256** (debug row above; add release SHA-256 for production builds)

## Environment variables

See root `.env` and [EAS_BUILD_ENV.md](./EAS_BUILD_ENV.md).

- `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID` — required; used as `serverClientId` on Android.
- `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID` — set from the **Android** OAuth client you created (docs / forward-compat; current `@clerk/expo` reads the web client ID for the native flow).

## Verify

1. Rebuild the dev client after config changes: `npx expo prebuild --clean && npx expo run:android`
2. Sign in with Google; you should land in the main app when `isSignedIn` is true.
3. If it still returns to the sign-in screen, check Logcat:  
   `adb logcat | grep -iE "credential|clerk|GoogleSignIn|GetCredential"`  
   Common messages: **Developer console is not set up correctly** (SHA-1 / package mismatch) or credential / Clerk errors after account pick.

## References

- [Clerk — Sign in with Google (Expo)](https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google)

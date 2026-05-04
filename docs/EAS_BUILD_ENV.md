# EAS Build — `EXPO_PUBLIC_*` variables

`.env` is loaded when you run `expo start` locally; **EAS Build does not read your repo’s `.env`** unless you use a different workflow. Set variables in one of these ways:

## Option A — Expo website (recommended)

In [expo.dev](https://expo.dev) → your project → **Environment variables**, add for **preview** and **production** (and **development** if you use cloud dev builds):

| Name | Notes |
|------|--------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Use `pk_live_...` for store/production; `pk_test_...` for internal preview if desired |
| `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID` | Web OAuth client ID (same GCP project as Android clients) |
| `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID` | Android OAuth client ID from Google Cloud Console |

## Option B — `eas.json` `env` blocks

The [eas.json](../eas.json) **development** profile includes `env` so local/EAS dev client builds match your test Clerk app when you don’t use dashboard variables.

For **preview** and **production**, prefer Option A so you never commit `pk_live_*`. If you inline keys in `eas.json`, treat that file as sensitive and rotate keys if leaked.

## Related

- [GOOGLE_SIGNIN_ANDROID.md](./GOOGLE_SIGNIN_ANDROID.md) — fingerprints, GCP, Clerk Native Applications

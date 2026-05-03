<div align="center">

# Laba — Live TV & Radio Streaming

**A cross-platform React Native client for streaming free-to-air Ugandan and international live TV and radio, engineered around a type-safe data layer, offline-first caching, and a dual media pipeline for HLS video and live audio.**

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![NativeWind](https://img.shields.io/badge/NativeWind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://www.nativewind.dev)
[![Platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

<img src="assets/screenshots/home.png" alt="Laba home screen" width="280" />

</div>

---

## About

**Laba** is a universal mobile and web app that gives users one place to discover and stream free-to-air live TV and radio stations — with a strong focus on Ugandan broadcasters alongside a curated international catalog. Every stream in the app is verified by an automated build pipeline, so listeners and viewers don't have to fight broken links.

The project is built to a production bar end-to-end: typed routes, schema-validated data, offline fallback, dual media engines, secure authentication, animated UI, and an automated CI-style data pipeline that ships a fresh, validated station index on every build.

Targets **iOS**, **Android**, and **Web** from a single Expo codebase.

---

## Screenshots

| Home | Settings |
| :---: | :---: |
| <img src="assets/screenshots/home.png" width="260" /> | <img src="assets/screenshots/settings.png" width="260" /> |
| **TV — Browse** | **TV — Detail & Player** |
| <img src="assets/screenshots/list-tv.png" width="260" /> | <img src="assets/screenshots/detail-tv.png" width="260" /> |
| **Radio — Browse** | **Radio — Detail & Player** |
| <img src="assets/screenshots/list-radio.png" width="260" /> | <img src="assets/screenshots/detail-radio.png" width="260" /> |

---

## Key Features

- **Dual media engines** — HLS live TV via `react-native-video`, live radio via `expo-audio`, each with its own player state machine.
- **Background audio** — continues radio playback when the app is backgrounded, using an Android foreground media service and the required runtime permissions.
- **Secure authentication** — Clerk sign-in/sign-up flows backed by `expo-secure-store` for token storage.
- **Offline-first data** — stations cached in `AsyncStorage` with a 24-hour TTL, plus a bundled fallback catalog that guarantees the app works on first launch or without a network.
- **Automated stream validation** — a Node-based builder probes every TV and radio URL before a release, so dead links never ship.
- **Search and favorites** — instant client-side search across all stations; favorites persist locally with optimistic updates.
- **Derived station slices** — featured, international, TV-only, and radio-only lists computed in a single O(n) pass and exposed via stable Zustand selectors.
- **Animated, themable UI** — dark and light themes, haptics, a Reanimated-powered waveform visualizer, and smooth file-based route transitions.
- **Typed routes** — `expo-router` typed routes plus the React Compiler experiment enabled for better runtime performance.

---

## Tech Stack

![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?logo=expo&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native_0.81-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Expo Router](https://img.shields.io/badge/Expo_Router_6-000020?logo=expo&logoColor=white)
![NativeWind](https://img.shields.io/badge/NativeWind_4-06B6D4?logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand_5-443E38?logo=react&logoColor=white)
![Zod](https://img.shields.io/badge/Zod_4-3E67B1?logo=zod&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk_Auth-6C47FF?logo=clerk&logoColor=white)
![react-native-video](https://img.shields.io/badge/react--native--video-FF4154)
![expo-audio](https://img.shields.io/badge/expo--audio-000020?logo=expo&logoColor=white)
![Reanimated](https://img.shields.io/badge/Reanimated_4-FF4154?logo=react&logoColor=white)
![AsyncStorage](https://img.shields.io/badge/AsyncStorage-003B57)
![EAS Build](https://img.shields.io/badge/EAS_Build-000020?logo=expo&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=black)

---

## Architecture

```
app/                 File-based routes (Expo Router) — auth layout + tab layout
components/          Reusable UI: player controls, station cards, waveform, etc.
stores/              Zustand stores: player, stations, favorites, theme
lib/                 Fetching, caching, Clerk token cache, helpers
data/                Bundled fallback station catalog (Zod-validated)
station-builder/     Node pipeline: fetch → validate → emit stations.json
assets/              Icons, splash, fonts, screenshots
constants/           Theme tokens, shared config
```

### Highlights

- **File-based routing** — `app/` is split into an authentication stack and a main tab layout (Home, TV, Radio, Favorites, Settings), with typed routes enabled in `app.json`.
- **Zustand stores** — `stores/` holds separate `player`, `stations`, `favorites`, and `theme` stores. Derived lists (featured / international / per-type) are computed once per fetch rather than per render, keeping subscriptions cheap and stable.
- **Data pipeline** — `station-builder/` is a standalone Node script that pulls from IPTV-org and Radio-Browser, probes every stream with a timeout, and writes a single `stations.json`. The app consumes that index, caches it for 24 hours, and falls back to the bundled `data/` catalog when offline or on first launch. Everything that crosses the network boundary is parsed through Zod, so invalid payloads never reach the UI.
- **Pending-station pattern** — when a user taps a station, the player store captures a "pending" station so playback can warm up before the detail screen is even mounted, shaving perceived latency off every tune-in.

---

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` (recommended) or `npm`
- Xcode (iOS) and/or Android Studio (Android)
- A Clerk account for a publishable key
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth clients if you use **native** Sign in with Google (see below)
- An Expo account if you want to run EAS builds

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Create a `.env` file at the project root.

**Clerk (required for any sign-in):**

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

**Google Sign-In on native (iOS / Android)** — the app uses [`useSignInWithGoogle`](https://clerk.com/docs/reference/expo/native-hooks/use-sign-in-with-google) on native and SSO on web. Clerk expects the **Web** and platform **OAuth client IDs** from Google Cloud in your env, not only the Clerk publishable key. Follow Clerk’s [Sign in with Google (Expo)](https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google) guide: enable Google under **SSO connections**, turn on **Use custom credentials**, register the Clerk **Authorized redirect URI** on a **Web application** client in Google Cloud, add your app under Clerk **Native applications**, then set:

```bash
# From your Google Cloud “Web application” OAuth client (same ID you paste into Clerk as Client ID)
EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Android — from the Android OAuth client in Google Cloud
EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# iOS — from the iOS OAuth client in Google Cloud
EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# iOS only — reversed client id for the URL scheme (prefix + numeric part before .apps.googleusercontent.com)
EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.your-ios-client-id
```

For **iOS**, you can also set `EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME` in `eas.json` build profiles instead of only `.env`. Native Google sign-in needs a **development build** or **prebuild**; it is not supported in **Expo Go** (see the Clerk guide above).

### 3. Run the app

```bash
pnpm start        # Metro dev server (Expo Dev Client / Expo Go)
pnpm android      # build & run on Android device/emulator
pnpm ios          # build & run on iOS simulator/device
pnpm web          # run in the browser
```

### 4. Native builds

```bash
pnpm prebuild        # generate native projects
pnpm prebuild:clean  # regenerate from scratch
pnpm build           # EAS build
```

### 5. Regenerate the station catalog (optional)

```bash
node station-builder/build.js
```

This fetches, validates, and writes a fresh `stations.json` that the app can consume.

---

## Scripts

| Script | Description |
| --- | --- |
| `pnpm start` | Start the Expo dev server |
| `pnpm android` | Run on an Android device or emulator |
| `pnpm ios` | Run on an iOS simulator or device |
| `pnpm web` | Run in the browser |
| `pnpm prebuild` | Generate native iOS/Android projects |
| `pnpm prebuild:clean` | Regenerate native projects from scratch |
| `pnpm build` | Create an EAS build |
| `pnpm lint` | Lint the project with `eslint-config-expo` |

---

## Roadmap

- Electronic Program Guide (EPG) for TV
- Chromecast / AirPlay support
- Downloadable radio sessions for offline listening
- Expanded regional catalogs
- Push notifications for "now live" favorites

---

## Author

**Yasin Walum**

- GitHub: [@wyasyn](https://github.com/wyasyn)

If you're a hiring manager or collaborator reviewing this project, feel free to reach out — I'm happy to walk through architectural decisions, the data pipeline, or the player state machine in more detail.

---

## License

Released under the [MIT License](https://opensource.org/licenses/MIT).

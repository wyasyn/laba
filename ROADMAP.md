# Laba roadmap

Feature gaps found in a review on 2026-10-05, planned in three phases. Work
top to bottom. Tick a box when the item is merged, and add a short note
(commit hash, anything deferred) under it.

## How to resume

1. Read this file and `git log --oneline -15` to see where things stand.
2. Pick the first unticked item. Each item lists the files involved, the
   approach, and what "done" means.
3. One branch per phase (`feat/phase-1-reliability`, `feat/phase-2-features`,
   `feat/phase-3-...`), one commit per item, conventional commit style
   (`feat:`, `fix:`, `chore:`).
4. Verify on a device or emulator before ticking. Note anything not verified.

---

## Phase 1: reliability and release blockers

Small items that fix real failures a new user would hit. Do these first.

### [ ] 1.1 Bundle radio stations in the offline fallback

**Problem:** `data/fallback-stations.json` has 29 TV stations and 0 radio.
On a first launch with no network the Radio tab is empty
(`stores/useStationStore.ts`, `loadFallbackStations`).

**Approach:**
- Add a script (e.g. `pnpm stations:snapshot`) that downloads
  `STATIONS_URL` (`lib/constants.ts`) and writes it to
  `data/fallback-stations.json`, validated with `stationsArraySchema`.
- Run it before release builds (document in README, or add to an EAS
  pre-build hook).
- Update the "TV-only JSON" comment in `useStationStore.ts`.
- Watch bundle size: if the full file is large, trim to featured plus top N
  per type.

**Done when:** airplane mode, fresh install, Radio tab shows stations.

### [ ] 1.2 Radio auto-reconnect and interruption recovery

**Problem:** any stream drop becomes an error that needs a manual retry
(`components/audio/AudioEngine.tsx`). No resume after a phone call.

**Approach:**
- In `AudioEngine`, when status goes to error (or stalls while
  `wantsPlaying`), retry automatically with backoff (e.g. 2s, 5s, 10s, max
  3 to 4 attempts) by bumping `reloadToken`. Only show the error after
  retries are exhausted.
- Add a `reconnecting` state (or reuse `loading` with a flag) so the player
  and mini-player can say "Reconnecting..." instead of failing.
- Handle audio interruptions: resume if `wantsPlaying` is still true after
  the interruption ends. Check what expo-audio exposes for this in SDK 57.
- Reset the retry counter on a successful `playing` and on user retry.

**Done when:** toggling network off and on mid-stream resumes on its own;
a phone call or other audio app pausing it resumes afterwards.

### [ ] 1.3 Network awareness

**Problem:** no connectivity detection. A failed refresh sets
`useStationStore.error` but nothing shows it; playing offline waits 20s
for a generic error.

**Approach:**
- Add `@react-native-community/netinfo` (`npx expo install`).
- Small `useNetworkStore` (or hook) exposing `isOnline`.
- Offline banner component, shown on tab screens and the station screen.
- On reconnect: call `refreshStations()` if the last refresh failed, and
  trigger the 1.2 reconnect if radio wants to play.
- In `AudioEngine`, fail fast with "You're offline" instead of the 20s
  timeout when offline.

**Done when:** going offline shows the banner within a second or two; coming
back online hides it and recovers playback and data.

### [ ] 1.4 Remove the placeholder Account screen

**Problem:** `app/account.tsx` says "Accounts are coming". Unused deps and an
unused iOS photo permission can trigger App Store rejection.

**Approach:**
- Delete `app/account.tsx` and the Account row in
  `app/(tabs)/settings.tsx`.
- Check `components/HeaderActions.tsx` and anything else linking to
  `/account`.
- Remove `expo-image-picker`, `expo-secure-store`, `expo-crypto` if nothing
  else imports them (grep first), plus the `expo-secure-store` plugin and
  `NSPhotoLibraryUsageDescription` in `app.json`.
- Also check whether `RECORD_AUDIO` in `app.json` is actually needed; drop
  it if not.

**Done when:** no references to `/account`, the deps are gone, `pnpm lint`
and a prebuild pass.

---

## Phase 2: features users expect

### [ ] 2.1 Share a station and deep links

**Approach:**
- Share button on the station screen (`app/station/[id].tsx`, both TV and
  radio headers) using React Native `Share`, linking to
  `https://laba.yasinwalum.com/station/<id>`.
- Universal links / Android App Links for `laba.yasinwalum.com/station/*`
  (`app.json` `associatedDomains` and `intentFilters`, plus
  `apple-app-site-association` and `assetlinks.json` served from the
  gh-pages site). Keep the `laba://station/<id>` scheme working.
- A simple web fallback page on the docs site for people without the app.
- Opening a link for an unknown id already shows "Station not found"; make
  sure it waits for stations to load first.

**Done when:** sharing from one device and tapping the link on another opens
the station in the app.

### [ ] 2.2 Sleep timer for radio

**Approach:**
- `sleepUntil: number | null` plus `setSleepTimer(minutes | null)` in
  `usePlayerStore`; a timer in `AudioEngine` pauses (with a short volume
  fade) when it expires.
- Options: 15, 30, 45, 60, 90 min, off. UI on the radio player
  (`components/AudioPlayer.tsx`), showing remaining time when active.
- Clear the timer on `stop()`.

**Done when:** timer pauses playback at the right time, including with the
app backgrounded and screen locked.

### [ ] 2.3 Picture-in-picture and background audio for TV

**Approach:**
- `components/VideoPlayer.tsx`: enable `react-native-video` PiP
  (`enterPictureInPicture`, auto-enter on background where supported) and
  `playInBackground` / `showNotificationControls`.
- `app.json`: `react-native-video` plugin options for PiP and background
  audio (`enableBackgroundAudio`, `enablePictureInPicture`); iOS
  `UIBackgroundModes` audio.
- YouTube channels (`YouTubePlayer.tsx`, WebView) likely cannot do this;
  document that and skip.
- Make sure TV and radio still never play at the same time.

**Done when:** an HLS TV stream continues in a PiP window on both platforms
when leaving the app.

### [ ] 2.4 Report a broken stream

**Approach:**
- "Report a problem" action on the station error state (radio player and
  `VideoPlayer` error UI) and in the station screen header menu.
- v1: prefilled email (station id, name, stream URL, app version, platform)
  to the existing support address in settings. Later: a form endpoint or
  GitHub issue.
- Optional: the station builder can read an exclusion list built from
  reports.

**Done when:** tapping report opens a prefilled message with the right details.

### [ ] 2.5 Country and language filters

**Approach:**
- `lib/search.ts`: helpers for top countries and languages, like
  `topCategories`.
- `components/StationList.tsx`: a second filter (chips or a sheet) for
  country and language, combined with the category filter.
- Search screen: same filters alongside the type chips.
- Show country names, not codes (a small code-to-name map, or `Intl`).

**Done when:** the TV and Radio lists can be narrowed by country and
language, and the filters combine with categories.

---

## Phase 3: later

Bigger or lower-priority items. Each one deserves its own short design pass
before coding.

- [ ] **3.1 Radio "now playing" metadata.** Read ICY `StreamTitle` metadata
  (check expo-audio support; may need a native module or a metadata proxy).
  Show it in the player, mini-player and lock screen.
- [ ] **3.2 Android Auto and CarPlay.** Likely needs a media-session based
  audio library or native modules; scope separately.
- [ ] **3.3 Crash and stream-failure reporting.** Sentry (`@sentry/react-native`
  with the Expo plugin). Log stream failures with station id to learn which
  stations fail in the field. Update `docs/privacy.md` accordingly.
- [ ] **3.4 Localization.** `expo-localization` plus a small i18n layer;
  English first, then Luganda and Swahili. Extract strings screen by screen.
- [ ] **3.5 Tablet layout.** `supportsTablet` is on but layouts are
  phone-only. More grid columns, wider player, maybe split view.
- [ ] **3.6 Tests and docs.** Jest plus React Native Testing Library for
  stores (`usePlayerStore`, `useStationStore`, `lib/search.ts`,
  `lib/homeSections.ts`) first. Update the README (still says SDK 54, lists
  a Favourites tab) and refresh screenshots.

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

### [x] 1.1 Bundle radio stations in the offline fallback

> Done in `cb5c491` on `feat/phase-1-reliability`. `pnpm stations:snapshot`
> writes the full catalog (65 stations, 28 KB, so no trimming). Kept as a
> manual pre-release step in the README rather than an EAS hook, so builds
> stay reproducible. Verified on the Android emulator: data cleared, wifi and
> data off, Radio tab lists 46 stations. Not checked on iOS.

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

### [x] 1.2 Radio auto-reconnect and interruption recovery

> Done in `2d513bb`. Connect timeout 15s, then reloads after 2s, 5s, 10s;
> error only after all three fail. expo-audio already pauses and resumes
> natively around transient interruptions, so the engine now just marks the
> stream `interrupted` and stays out of the way. Verified on the Android
> emulator: network off mid-stream retries on schedule then errors; network
> back during retries resumes on its own; a simulated incoming call shows
> "Paused" and playback resumes after hang-up. Not checked on iOS.

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

### [x] 1.3 Network awareness

> Done in `3a1cc65`. NetInfo-backed `useNetworkStore` (unknown reachability
> counts as online). One global "You're offline" pill under the status bar
> rather than per-screen banners. Verified on the Android emulator: pill
> appears within about 3s of cutting wifi and data; opening radio offline
> errors at once with "You're offline"; reconnecting hides the pill and the
> stream resumes by itself. Not checked on iOS.

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

### [x] 1.4 Remove the placeholder Account screen

> Done in `636f1b9`. `RECORD_AUDIO` was only there because the expo-audio
> plugin adds it by default; the app never records, so the plugin now runs
> with `recordAudioAndroid: false` and `microphonePermission: false`, and
> the permission is in `blockedPermissions`. Clean Android prebuild and
> build pass; the merged manifest marks `RECORD_AUDIO` as removed.

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

### [x] 2.1 Share a station and deep links

> Done in `a53dfab` on `feat/phase-2-features`. Verified on the Android
> emulator: share sheet sends "Watch <name> live on Laba: <link>"; with the
> domain approved by hand (`pm set-app-links-user-selection`), opening
> `https://laba.yasinwalum.com/station/<id>` lands on that station and plays.
> **Still to do before this works for real users:**
> - `docs/.well-known/assetlinks.json` has the EAS release key and the local
>   debug key. Once on Google Play, also add the Play App Signing key (Play
>   Console, App integrity).
> - `docs/.well-known/apple-app-site-association` has an `APPLE_TEAM_ID`
>   placeholder; replace it with the Apple Developer Team ID.
> - Merge to `main` so `deploy-docs.yml` publishes `.well-known/` and
>   `404.html`, then check `https://laba.yasinwalum.com/.well-known/assetlinks.json`.
> - The web fallback's "Get the app" link points at the docs home page; point
>   it at the store listing once there is one.
> Not checked on iOS or on a second device.

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

### [x] 2.2 Sleep timer for radio

> Done in `e2ab124`. JS timers stop when an Android app is backgrounded, so
> the timer is checked on expo-audio's native status events instead.
> Verified on the Android emulator with a temporary 1-minute option: app
> backgrounded and screen locked, playback paused on time. Not checked on iOS.

**Approach:**
- `sleepUntil: number | null` plus `setSleepTimer(minutes | null)` in
  `usePlayerStore`; a timer in `AudioEngine` pauses (with a short volume
  fade) when it expires.
- Options: 15, 30, 45, 60, 90 min, off. UI on the radio player
  (`components/AudioPlayer.tsx`), showing remaining time when active.
- Clear the timer on `stop()`.

**Done when:** timer pauses playback at the right time, including with the
app backgrounded and screen locked.

### [x] 2.3 Picture-in-picture and background audio for TV

> Done in `2fdb2da`. Verified on the Android emulator: Bukedde TV 1 (HLS)
> keeps playing in a PiP window after pressing Home. YouTube channels are
> WebView-based and not covered. Not checked on iOS (needs a device build).

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

### [x] 2.4 Report a broken stream

> Done in `e279a37`. "Report a problem" sits on the radio error card, the
> video error overlay and a footer link on both station screens, rather
> than a header menu (there is no menu to put it in). Verified on the
> Android emulator: the mailto intent carries the station id, name, stream
> URL, app version and platform.

**Approach:**
- "Report a problem" action on the station error state (radio player and
  `VideoPlayer` error UI) and in the station screen header menu.
- v1: prefilled email (station id, name, stream URL, app version, platform)
  to the existing support address in settings. Later: a form endpoint or
  GitHub issue.
- Optional: the station builder can read an exclusion list built from
  reports.

**Done when:** tapping report opens a prefilled message with the right details.

### [x] 2.5 Country and language filters

> Done in `1639e17`. One filter button at the end of the category rail opens
> a sheet with both filters. Also fixed a grid bug the filters exposed:
> recycled FlashList cells kept the wrong column gutters. Verified on the
> Android emulator: Uganda + English + Religious narrows Radio to 5 stations.

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

> Phase 3 landed as one commit, `714e083` on `feat/phase-3-later`, because
> localization touched almost every file the other items changed. Device
> checks for 3.1, 3.4 and 3.5 were finished afterwards on the Android
> emulator (Pixel 10 Pro XL); see the notes under each.

- [x] **3.1 Radio "now playing" metadata.** A pnpm patch to expo-audio
  (`patches/expo-audio.patch`) reads ICY `StreamTitle` from ExoPlayer's
  timed metadata into the player status; the app shows it in the player,
  mini-player and lock screen. Multi-field titles ("a | b | url") are
  trimmed to two fields. expo-audio is built from source
  (`expo.autolinking.android.buildFromSource` in package.json): SDK 57
  links a precompiled AAR that silently ignored the patch at first.
  Verified: many catalogue streams send titles (curl), the patched module
  compiles from source, and on the emulator .977 Hitz showed the song
  ("Shakira - Dai Dai (feat. Burna Boy)") in the player and mini-player,
  with the lock screen session reading song, then station. Android only;
  iOS needs an
  `AVPlayerItemMetadataOutput` patch.
- [ ] **3.2 Android Auto and CarPlay.** Android Auto built; CarPlay not
  started. `modules/laba-auto` is a local Expo module with a Media3
  `MediaLibraryService` and its own ExoPlayer, because Auto can start the
  service while the app is closed, before React Native exists. Browse tree:
  Favourites, Recent (car plays first, then the app's), Stations (A to Z),
  Categories; logos through a content provider (Auto only loads content://
  artwork), app icon when a logo is missing or dead; search and voice
  ("play religious on Laba"); a tapped station brings its list, so next and
  previous move through it; ICY song titles shown as "song, by station";
  retry with backoff like the app. The app syncs stations, favourites,
  recents and translated tab names (`lib/carSync.ts`); starting a station on
  either side pauses the other. Verified on the Android emulator with a
  throwaway in-app client on the legacy `MediaBrowser` API that Auto uses:
  tree, artwork, play, next, voice search and pause all work, and the
  phone-to-car handoff works both ways without a crash. **Still to do:**
  - Test in the Desktop Head Unit on a real phone (needs Android Auto with
    developer mode; not possible on this emulator without a Google sign-in).
  - Play Console: opt into Android Auto under Advanced settings, then pass
    the Auto review before it shows in cars.
  - Luganda and Kiswahili tab names (`car.*` keys) need a native check.
  - A station started on the phone before connecting keeps playing on the
    phone player and does not show in the car until one is picked there.
  - CarPlay: Apple's audio-app entitlement (request via developer.apple.com,
    can take weeks), then a `CPTemplateApplicationScene`.
- [x] **3.3 Crash and stream-failure reporting.** `@sentry/react-native`,
  on only when `EXPO_PUBLIC_SENTRY_DSN` is set in a release build
  (`lib/telemetry.ts`). Radio stations that fail every retry and TV
  stream errors are reported per station. `docs/privacy.md` updated.
  Deferred by choice: no Sentry project for now, so nothing is sent and
  the code stays inert. When wanted: create the project, set the DSN in
  EAS env vars, turn on "Prevent storing of IP addresses", and for
  readable stack traces add the `@sentry/react-native/expo` plugin with
  `SENTRY_AUTH_TOKEN` (the `@sentry/cli` postinstall is disabled in
  `pnpm-workspace.yaml` until then).
- [x] **3.4 Localization.** `expo-localization` plus `lib/i18n` (typed
  keys, `{param}` fill, `_one`/`_other` plurals); English, Kiswahili and
  Luganda; picker in Settings; every UI string extracted. A test checks
  that translations cover every key and keep the same placeholders.
  Luganda and Kiswahili copy reviewed and accepted. Station data (names, categories, countries) stays
  in English. Verified on the emulator: switching to Kiswahili and
  Luganda updates tabs, Settings, lists and the mini-player at once; the
  choice survives a restart; "Same as phone" goes back to English.
- [x] **3.5 Tablet layout.** Grids use 2, 3 or 4 columns by window width
  with equal card widths; Settings, radio controls and TV details are
  width-capped. Verified on the emulator by lowering the density to
  simulate wider screens: 3 columns at about 670dp, 4 at about 980dp, with
  even gutters after scrolling. Not checked on a real tablet.
- [x] **3.6 Tests and docs.** Jest via `jest-expo` (`pnpm test`): 33 tests
  over search, home sections, stream titles, i18n, the player store and
  the station store. README updated (SDK 57, tabs, new features, Sentry).
  Screenshots in `assets/screenshots` and `docs/assets/screenshots`
  retaken from a release build, plus a new filters shot on the docs page.

---

## Phase 4: personalisation and accounts

Plan: the taste engine runs on the device and needs no account; sign-in is
optional and only adds backup and sync across devices. Provider: Supabase
(auth + Postgres with row-level security), Google and email OTP sign-in.

- [x] **4.1 On-device taste engine.** `lib/taste.ts` (pure scoring,
  `lib/__tests__/taste.test.ts`), `stores/useTasteStore.ts` (persisted
  per-station tally: opens, listen time, skips, part of day),
  `lib/listenTracker.ts` (radio listen time from the player store, saved
  every minute and on background; TV time from the station screen). Home
  adds "Jump back in", "For you" and "Because you like {category}" above
  Featured; a new user sees the old layout. Settings has a Personalisation
  section (pause learning, clear history). Verified on the Android emulator
  (release build): fresh install shows the default Home; after a minute of
  gospel radio and a short news visit all three rows appear with sensible
  picks; clearing history restores the default; rows survive a force-stop.
  **Still to do:** native check of the new Luganda and Kiswahili strings
  (`home.jumpBackIn`, `home.forYou`, `home.becauseYouLike`,
  `settings.personalisation`, `settings.learn`, `settings.on/off`,
  `settings.clearTaste*`). Not checked on iOS.
- [ ] **4.2 Optional sign-in and sync (Supabase).** Needs a Supabase project
  and Google OAuth clients first. Plan: one `profiles` row per user
  (favourites, recents, taste jsonb) under RLS; `lib/supabase.ts` inert
  without env vars; `stores/useAuthStore.ts` (Google via
  `@react-native-google-signin/google-signin` + `signInWithIdToken`, email
  OTP code); `lib/cloudSync.ts` merges on sign-in and upserts debounced;
  `app/account.tsx` with in-app account deletion (Edge Function); privacy
  policy and Play Data safety update. Add Sign in with Apple before an iOS
  release (App Store guideline 4.8).

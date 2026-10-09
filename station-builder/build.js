#!/usr/bin/env node
/**
 * Laba Station Builder
 *
 * Fetches TV and radio stations from iptv-org and radio-browser.info,
 * validates every stream URL, and writes a clean stations.json.
 *
 * Run locally:   node station-builder/build.js
 * Output:        station-builder/output/stations.json
 *
 * Requirements:  Node.js 18+ (built-in fetch + AbortSignal.timeout)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");
const OUTPUT_FILE = join(OUTPUT_DIR, "stations.json");

// ─── External API endpoints ──────────────────────────────────────────────────

const IPTV_CHANNELS = "https://iptv-org.github.io/api/channels.json";
const IPTV_STREAMS = "https://iptv-org.github.io/api/streams.json";
const UGANDA_M3U = "https://iptv-org.github.io/iptv/countries/ug.m3u";
// The catalog the apps use today: its ids are kept stable (favourites and
// recents are stored by id) and its radio stations stay while they still work.
const PREVIOUS_CATALOG = "https://laba.yasinwalum.com/stations.json";

// User-Agent required by radio-browser.info to avoid being blocked
const RADIO_USER_AGENT = "Laba/1.0 (github.com/wyasyn/laba)";

// ─── Filtering constants ──────────────────────────────────────────────────────

const INTERNATIONAL_ENGLISH_CAP = 200;

// Radio: every healthy Ugandan station, a capped slice of East Africa, then
// the most listened-to stations worldwide with a per-country cap so no single
// country dominates the list.
const EAST_AFRICA_COUNTRIES = ["KE", "TZ", "RW", "SS", "CD", "BI"];
const EAST_AFRICA_PER_COUNTRY_CAP = 40;
const INTERNATIONAL_RADIO_POOL = 400;
const INTERNATIONAL_PER_COUNTRY_CAP = 8;
const INTERNATIONAL_RADIO_CAP = 200;
const FEATURED_UG_RADIO_COUNT = 12;

const WANTED_TV_CATEGORIES = new Set([
  "news", "general", "entertainment", "sports", "kids",
  "business", "documentary", "science", "education",
]);

// Known Ugandan channel names for M3U matching (exact / close match only)
const UGANDA_CHANNEL_NAMES = [
  "NBS TV", "NTV Uganda", "UBC TV", "Sanyuka TV", "Spark TV",
  "Urban TV", "Pearl Magic", "Pearl Magic Prime", "BBS TV Buganda",
  "Record TV Uganda", "Bukedde TV", "Bukedde TV 1", "Bukedde TV 2",
  "3ABN TV Uganda", "ACW UG TV", "Alpha Digital", "Ark TV", "BTM TV",
  "BTV Uganda", "Dream TV Uganda", "Faraja Television", "FORT TV",
  "Galaxy TV Uganda", "Gugudde TV", "Praise Jesus Tower TV", "Salt TV Uganda",
  "TV West", "Wan Luo TV", "Hope Channel Uganda",
  "Nile Broadcasting Services", "Star TV Uganda", "Agape TV Uganda",
  "Canary TV Uganda", "KBC Uganda",
];

const UGANDA_NAMES_LOWER = UGANDA_CHANNEL_NAMES.map((n) => n.toLowerCase());

// ─── Hardcoded supplement stations ───────────────────────────────────────────
// Major channels whose streams often fail validation on GitHub Actions servers
// (YouTube proxies, etc.) but are known to work on devices. These are always
// merged into the final output — they supplement rather than replace API results.

// NBS, NTV, UBC, Sanyuka, Spark, Urban, Pearl Magic, BBS, Record: YouTube Live only.
// Each youtubeChannelId is checked at build time (must be live) before inclusion.

const SUPPLEMENT_TV_STATIONS = [
  // ── Uganda channels (YouTube Live) ──────────────────────────────────────────
  // The app uses YouTubePlayer for any station that has a youtubeChannelId field.
  {
    id: "nbs-tv", name: "NBS TV", type: "tv",
    logo: "https://i.imgur.com/DmM8jH6.png",
    youtubeChannelId: "UCmp-YJRNIHCCNmFJOgJGMwA",
    description: "Next Broadcasting Services - Uganda's leading entertainment and news channel",
    language: "English", country: "UG", categories: ["news", "entertainment"],
    website: "https://www.nbs.ug", isFeatured: true,
  },
  {
    id: "ntv-uganda", name: "NTV Uganda", type: "tv",
    logo: "https://i.imgur.com/NTV.png",
    youtubeChannelId: "UCzIwTMsmMSGIdZPYShYbnPQ",
    description: "Nation Television Uganda - Premier news and current affairs",
    language: "English", country: "UG", categories: ["news", "general"],
    website: "https://www.ntv.co.ug", isFeatured: true,
  },
  {
    id: "ubc-tv", name: "UBC TV", type: "tv",
    youtubeChannelId: "UCa7s2SKcRQDpMEB-yPbXkvA",
    description: "Uganda Broadcasting Corporation - National public broadcaster",
    language: "English", country: "UG", categories: ["general", "news"],
    website: "https://www.ubc.go.ug", isFeatured: true,
  },
  {
    id: "sanyuka-tv", name: "Sanyuka TV", type: "tv",
    youtubeChannelId: "UC1YJ4mMOExwmnOYgiAWbKtQ",
    description: "Entertainment and lifestyle television",
    language: "Luganda", country: "UG", categories: ["entertainment"],
    isFeatured: true,
  },
  {
    id: "spark-tv", name: "Spark TV", type: "tv",
    youtubeChannelId: "UCF-5JhTmMFJwTEygqBPfQLg",
    description: "Youth-oriented entertainment and music channel",
    language: "English", country: "UG", categories: ["entertainment", "music"],
    isFeatured: true,
  },
  {
    id: "urban-tv", name: "Urban TV", type: "tv",
    youtubeChannelId: "UCJrvFPaz4DF96mWbiOSGXkA",
    description: "Urban entertainment and lifestyle",
    language: "English", country: "UG", categories: ["entertainment"],
    isFeatured: false,
  },
  {
    id: "pearl-magic", name: "Pearl Magic", type: "tv",
    youtubeChannelId: "UCp-RVKH9VwArl8cD7XtZiqQ",
    description: "Local drama and entertainment",
    language: "English", country: "UG", categories: ["entertainment", "drama"],
    isFeatured: false,
  },
  {
    id: "bbs-tv", name: "BBS TV", type: "tv",
    youtubeChannelId: "UCp90V7fUBeBGAa5jc_v2b0g",
    description: "Buganda Broadcasting Service Television",
    language: "Luganda", country: "UG", categories: ["general", "cultural"],
    isFeatured: false,
  },
  {
    id: "record-tv-uganda", name: "Record TV Uganda", type: "tv",
    youtubeChannelId: "UCfwhx3cp2bLnkxMjRmPgiHQ",
    description: "News and entertainment from Record TV",
    language: "English", country: "UG", categories: ["news", "entertainment"],
    isFeatured: false,
  },
  // ── International channels (direct HLS CDN) ──────────────────────────────────
  // These have official CDN-hosted HLS streams and broadcast in English.
  {
    id: "al-jazeera-english", name: "Al Jazeera English", type: "tv",
    streamUrl: "https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8",
    description: "International news from Al Jazeera",
    language: "English", country: "QA", categories: ["news"],
    website: "https://www.aljazeera.com", isFeatured: true,
  },
  {
    id: "france-24-english", name: "France 24 English", type: "tv",
    streamUrl: "https://live.france24.com/hls/live/2037218/F24_EN_HI_HLS/master_2300.m3u8",
    description: "International news in English from France 24",
    language: "English", country: "FR", categories: ["news"],
    website: "https://www.france24.com", isFeatured: false,
  },
  {
    id: "dw-english", name: "DW English", type: "tv",
    streamUrl: "https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/master.m3u8",
    description: "Deutsche Welle English - International news",
    language: "English", country: "DE", categories: ["news"],
    website: "https://www.dw.com", isFeatured: false,
  },
  {
    id: "bbc-news", name: "BBC News", type: "tv",
    streamUrl: "https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/mobile_wifi_main_hd_abr_v2.m3u8",
    description: "BBC News - International breaking news and analysis",
    language: "English", country: "GB", categories: ["news"],
    website: "https://www.bbc.com/news", isFeatured: true,
  },
  {
    id: "euronews-english", name: "Euronews English", type: "tv",
    streamUrl: "https://dash4.antik.sk/live/test_euronews/playlist.m3u8",
    description: "European news and current affairs in English",
    language: "English", country: "FR", categories: ["news"],
    website: "https://www.euronews.com", isFeatured: false,
  },
  {
    id: "nhk-world-japan", name: "NHK World Japan", type: "tv",
    streamUrl: "https://masterpl.hls.nhkworld.jp/hls/w/live/smarttv.m3u8",
    description: "Japan's international public broadcaster - news and culture",
    language: "English", country: "JP", categories: ["news", "general"],
    website: "https://www3.nhk.or.jp/nhkworld/", isFeatured: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Strict Uganda channel check — used for orphan M3U streams only.
 * Requires a close name match (exact or one contains the other at word level).
 */
function isUgandaChannelName(name) {
  const n = name.toLowerCase().trim();
  return UGANDA_NAMES_LOWER.some(
    (w) => n === w || n.startsWith(w) || w.startsWith(n)
  );
}

function inferType(categories) {
  if (
    Array.isArray(categories) &&
    categories.some(
      (c) => typeof c === "string" && c.toLowerCase().includes("radio")
    )
  )
    return "radio";
  return "tv";
}

// ─── Stream URL validation ────────────────────────────────────────────────────

const BAD_CT_SUBSTR = ["text/html", "application/xhtml", "application/json"];

function contentTypeIsBad(ct) {
  const c = (ct ?? "").toLowerCase();
  return BAD_CT_SUBSTR.some((b) => c.includes(b));
}

function contentTypeOkForStream(ct, type) {
  const c = (ct ?? "").toLowerCase();
  if (!c || contentTypeIsBad(ct)) return false;
  if (type === "radio") {
    if (c.startsWith("audio/")) return true;
    if (c.includes("application/ogg")) return true;
    if (c.includes("application/vnd.apple.mpegurl")) return true;
    if (c.includes("video/mp2t")) return true;
    if (c.includes("application/octet-stream")) return true;
    return false;
  }
  // TV
  if (c.includes("application/vnd.apple.mpegurl")) return true;
  if (c.startsWith("video/")) return true;
  if (c.includes("mpegurl")) return true;
  if (c.includes("mp2t")) return true;
  if (c.includes("mp4")) return true;
  if (c.startsWith("audio/")) return true;
  if (c.includes("application/octet-stream")) return true;
  return false;
}

function isLikelyM3u8Url(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith(".m3u8") || path.endsWith(".m3u");
  } catch {
    const u = String(url).split("?")[0].toLowerCase();
    return u.endsWith(".m3u8") || u.endsWith(".m3u");
  }
}

/**
 * Reads only the first bytes of the body. Icecast/SHOUTcast servers ignore
 * Range and stream forever, so waiting for the whole body (arrayBuffer) would
 * always hit the timeout and reject a working station.
 */
async function probeStreamBody(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1023", "User-Agent": RADIO_USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok && res.status !== 206) return { ok: false, chunk: null, ct: "" };
    const ct = res.headers.get("content-type") ?? "";
    if (!res.body) return { ok: false, chunk: null, ct };

    const reader = res.body.getReader();
    const parts = [];
    let size = 0;
    while (size < 512) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const chunk = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      chunk.set(part, offset);
      offset += part.byteLength;
    }
    return { ok: true, chunk: chunk.slice(0, 512), ct };
  } catch {
    return { ok: false, chunk: null, ct: "" };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

async function verifyM3u8Playlist(url, timeoutMs) {
  const { ok, chunk, ct } = await probeStreamBody(url, timeoutMs);
  if (!ok || !chunk) return false;
  if (contentTypeIsBad(ct)) return false;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(chunk).trimStart();
  return text.startsWith("#EXTM3U");
}

async function verifyBodyNotHtml(url, timeoutMs) {
  const { ok, chunk, ct } = await probeStreamBody(url, timeoutMs);
  if (!ok || !chunk) return false;
  if (contentTypeIsBad(ct)) return false;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(chunk).trimStart().toLowerCase();
  if (text.startsWith("<!doctype") || text.startsWith("<html")) return false;
  return true;
}

/**
 * Many Icecast/SHOUTcast URLs omit Content-Type on HEAD; probe the body instead.
 */
async function verifyRadioStreamBody(url, timeoutMs) {
  const { ok, chunk, ct } = await probeStreamBody(url, timeoutMs);
  if (!ok || !chunk || chunk.byteLength < 2) return false;
  const c = (ct ?? "").toLowerCase();
  if (contentTypeIsBad(ct)) return false;
  if (c.startsWith("audio/")) return true;
  if (c.includes("application/vnd.apple.mpegurl")) return true;
  if (c.includes("application/ogg")) return true;
  if (c.includes("video/mp2t")) return true;

  const utf = new TextDecoder("utf-8", { fatal: false }).decode(chunk).trimStart();
  if (utf.startsWith("#EXTM3U")) return true;
  const low = utf.toLowerCase();
  if (low.startsWith("<!doctype") || low.startsWith("<html")) return false;

  if (c.includes("application/octet-stream") || !c) {
    const b0 = chunk[0];
    const b1 = chunk[1];
    const b2 = chunk[2];
    const b3 = chunk[3];
    // ID3 tag or MPEG frame sync (common for MP3 streams)
    if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) return true;
    if (b0 === 0xff && (b1 & 0xe0) === 0xe0) return true;
    // Ogg
    if (b0 === 0x4f && b1 === 0x67 && b2 === 0x67 && b3 === 0x53) return true;
  }
  return false;
}

/**
 * @param {string} url
 * @param {number} timeoutMs
 * @param {"tv" | "radio"} type
 */
async function checkUrl(url, timeoutMs, type = "tv") {
  try {
    // HLS / M3U playlists: always require #EXTM3U at start (HEAD is often wrong).
    if (isLikelyM3u8Url(url)) {
      return await verifyM3u8Playlist(url, timeoutMs);
    }

    // Many Icecast servers hang on HEAD or reject it; one GET sniff is enough.
    if (type === "radio") {
      return await verifyRadioStreamBody(url, timeoutMs);
    }

    let res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });

    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
    }

    if (!(res.status >= 200 && res.status < 300)) return false;

    const ct = res.headers.get("content-type") ?? "";
    if (contentTypeIsBad(ct)) return false;

    if (!contentTypeOkForStream(ct, type)) {
      if (type === "radio") {
        return await verifyRadioStreamBody(url, timeoutMs);
      }
      return false;
    }

    if (type === "radio" || ct.toLowerCase().includes("octet-stream")) {
      return await verifyBodyNotHtml(url, timeoutMs);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * True only when the channel is broadcasting live right now (strict list policy).
 */
async function isYouTubeChannelLive(channelId, timeoutMs = 12000) {
  try {
    const res = await fetch(
      `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13)" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      }
    );
    if (!res.ok) return false;
    const body = await res.text();
    if (
      /LIVE_STREAM_OFFLINE|OFFLINE_PLACEHOLDER|"status":"ERROR"/.test(body)
    ) {
      return false;
    }
    const m = body.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    return !!m && m[1] !== "live_stream";
  } catch {
    return false;
  }
}

async function validateYouTubeSupplements(stations, concurrency = 5, timeoutMs = 12000) {
  const valid = [];
  const total = stations.length;
  let done = 0;

  for (let i = 0; i < stations.length; i += concurrency) {
    const batch = stations.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (station) => ({
        station,
        ok: await isYouTubeChannelLive(station.youtubeChannelId, timeoutMs),
      }))
    );
    for (const { station, ok } of results) {
      if (ok) valid.push(station);
    }
    done += batch.length;
    process.stdout.write(`  YouTube ${done}/${total} checked (${valid.length} live)\r`);
  }
  process.stdout.write("\n");
  return valid;
}

/**
 * Checks the station's stream, falling back to alternate URLs for the same
 * station. A working alternate replaces streamUrl.
 */
async function checkStationStream(station, timeoutMs) {
  const type = station.type === "radio" ? "radio" : "tv";
  if (await checkUrl(station.streamUrl, timeoutMs, type)) return true;
  for (const url of ALTERNATE_STREAM_URLS.get(station.id) ?? []) {
    if (await checkUrl(url, timeoutMs, type)) {
      station.streamUrl = url;
      return true;
    }
  }
  return false;
}

async function validateStreamUrls(
  stations,
  batchSize = 50,
  timeoutMs = 8000,
  maxConcurrency = 8
) {
  const valid = [];
  const total = stations.length;
  let done = 0;
  // GET-based checks + some CDNs rate-limit heavy parallelism
  const effectiveBatch = Math.min(batchSize, maxConcurrency);

  for (let i = 0; i < stations.length; i += effectiveBatch) {
    const batch = stations.slice(i, i + effectiveBatch);
    const results = await Promise.all(
      batch.map(async (station) => ({
        station,
        ok: await checkStationStream(station, timeoutMs),
      }))
    );
    for (const { station, ok } of results) {
      if (ok) valid.push(station);
    }
    done += batch.length;
    process.stdout.write(`  ${done}/${total} checked (${valid.length} valid)\r`);
  }
  process.stdout.write("\n");
  return valid;
}

// ─── TV: iptv-org ─────────────────────────────────────────────────────────────

function mergeChannelsAndStreams(channels, streams) {
  const stations = [];
  const seen = new Set();

  const streamsByChannel = new Map();
  const unmatchedStreams = [];

  for (const stream of streams) {
    if (stream.channel) {
      const existing = streamsByChannel.get(stream.channel) ?? [];
      existing.push(stream);
      streamsByChannel.set(stream.channel, existing);
    } else {
      unmatchedStreams.push(stream);
    }
  }

  for (const channel of channels) {
    if (channel.closed) continue;

    const channelStreams = streamsByChannel.get(channel.id);
    if (!channelStreams || channelStreams.length === 0) continue;

    const bestStream =
      channelStreams.find((s) => s.quality === "1080p") ||
      channelStreams.find((s) => s.quality === "720p") ||
      channelStreams[0];

    const id = slugify(channel.name);
    if (seen.has(id)) continue;
    seen.add(id);

    stations.push({
      id,
      name: channel.name,
      type: inferType(channel.categories ?? []),
      logo: channel.logo ?? undefined,
      streamUrl: bestStream.url,
      description: (channel.categories ?? []).join(", ") || "Live channel",
      language: channel.languages?.[0] ?? "English",
      country: channel.country,
      categories: channel.categories ?? [],
      website: channel.website ?? undefined,
      isFeatured: channel.country === "UG",
    });
  }

  // Orphan streams (no channel ID) — only add well-known Uganda names
  for (const stream of unmatchedStreams) {
    if (!isUgandaChannelName(stream.title)) continue;
    const id = slugify(stream.title);
    if (seen.has(id)) continue;
    seen.add(id);
    stations.push({
      id,
      name: stream.title,
      type: "tv",
      streamUrl: stream.url,
      description: "Live channel",
      language: "English",
      country: "UG",
      categories: [],
      isFeatured: false,
    });
  }

  return stations;
}

function parseM3U(content) {
  const lines = content.split("\n").map((l) => l.trim());
  const stations = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXTINF")) continue;

    const infoLine = lines[i];
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#")) continue;

    const nameMatch = infoLine.match(/,(.+)$/);
    const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
    const groupMatch = infoLine.match(/group-title="([^"]*)"/);

    const name = nameMatch?.[1]?.trim() || "Unknown";

    // Only include M3U entries that are known Ugandan channels.
    // The Uganda M3U from iptv-org also contains non-Ugandan channels
    // (Pluto TV, WBTV, etc.) — exclude those.
    if (!isUgandaChannelName(name)) continue;

    const id = slugify(name);
    if (seen.has(id)) continue;
    seen.add(id);

    const group = groupMatch?.[1]?.toLowerCase() ?? "";

    stations.push({
      id,
      name,
      type: group.includes("radio") ? "radio" : "tv",
      logo: logoMatch?.[1] || undefined,
      streamUrl: urlLine,
      description: groupMatch?.[1] ?? "Live channel",
      language: "English",
      country: "UG",
      categories: groupMatch?.[1] ? [groupMatch[1]] : [],
      isFeatured: false,
    });
  }

  return stations;
}

async function fetchTvStations() {
  console.log("  Fetching iptv-org channels + streams...");
  const stations = [];
  const seenIds = new Set();
  const seenUrls = new Set();

  try {
    const [channelsRes, streamsRes] = await Promise.all([
      fetch(IPTV_CHANNELS),
      fetch(IPTV_STREAMS),
    ]);

    if (channelsRes.ok && streamsRes.ok) {
      const channelsRaw = await channelsRes.json();
      const streamsRaw = await streamsRes.json();

      const wantedChannelIds = new Set();
      const candidateChannels = [];
      let internationalCount = 0;

      for (const c of channelsRaw) {
        if (!c || typeof c !== "object") continue;
        if (c.closed || c.is_nsfw) continue;
        if (typeof c.name !== "string" || typeof c.id !== "string") continue;

        const langs = Array.isArray(c.languages)
          ? c.languages.filter((l) => typeof l === "string")
          : [];
        const cats = Array.isArray(c.categories)
          ? c.categories.filter((cat) => typeof cat === "string")
          : [];

        const isUganda = c.country === "UG";

        // International: must claim English language AND have a relevant category.
        // We do NOT restrict by country — channels like Al Jazeera (QA),
        // France 24 (FR), DW (DE), and NHK World (JP) all broadcast in English
        // but their countries are not English-speaking.
        const isIntlEnglish =
          !isUganda &&
          langs.includes("eng") &&
          cats.some((cat) => WANTED_TV_CATEGORIES.has(cat.toLowerCase())) &&
          internationalCount < INTERNATIONAL_ENGLISH_CAP;

        if (!isUganda && !isIntlEnglish) continue;
        if (!isUganda) internationalCount++;

        wantedChannelIds.add(c.id);
        candidateChannels.push(c);
      }

      const candidateStreams = [];
      for (const s of streamsRaw) {
        if (!s || typeof s !== "object") continue;
        if (typeof s.url !== "string") continue;
        if (s.channel && wantedChannelIds.has(s.channel)) {
          candidateStreams.push(s);
        }
        // Orphan streams without a channel ID are handled via M3U below
      }

      console.log(
        `  iptv-org: ${candidateChannels.length} candidate channels, ${candidateStreams.length} streams`
      );

      const merged = mergeChannelsAndStreams(candidateChannels, candidateStreams);
      for (const s of merged) {
        if (!seenIds.has(s.id) && !seenUrls.has(s.streamUrl)) {
          seenIds.add(s.id);
          seenUrls.add(s.streamUrl);
          stations.push(s);
        }
      }
    }
  } catch (e) {
    console.warn("  iptv-org JSON API failed:", e.message);
  }

  // Uganda M3U — filtered strictly to known Uganda channel names only
  try {
    const m3uRes = await fetch(UGANDA_M3U);
    if (m3uRes.ok) {
      const m3uStations = parseM3U(await m3uRes.text());
      let added = 0;
      for (const s of m3uStations) {
        if (!seenIds.has(s.id) && !seenUrls.has(s.streamUrl)) {
          seenIds.add(s.id);
          seenUrls.add(s.streamUrl);
          stations.push(s);
          added++;
        }
      }
      console.log(`  Uganda M3U: ${added} additional Uganda channels`);
    }
  } catch (e) {
    console.warn("  Uganda M3U failed:", e.message);
  }

  // Deduplicate by stream URL a final time (removes quality variants like
  // "Bukedde TV 1 (576p)" that share a URL with "Bukedde TV 1")
  const urlSeen = new Set();
  const deduped = [];
  for (const s of stations) {
    if (!urlSeen.has(s.streamUrl)) {
      urlSeen.add(s.streamUrl);
      deduped.push(s);
    }
  }

  return deduped;
}

// ─── Radio: radio-browser.info ────────────────────────────────────────────────

/** The app schema needs a full http(s) URL; Radio Browser often has bare domains. */
function httpUrlOrUndefined(value) {
  try {
    const url = new URL((value ?? "").trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** "KFM - Kampala - 93.3 FM (MP3)" -> "KFM - Kampala - 93.3 FM" */
function displayRadioName(name) {
  return name.replace(/\s*\((?:MP3|AAC\+?|OGG|OPUS|HLS)\)\s*$/i, "").trim();
}

/** FM frequency in the name, e.g. "87.9" from "Akaboozi FM 87.9". */
function frequencyOf(name) {
  return name.match(/\b(8[7-9]|9\d|10[0-8])[.,](\d)\b/)?.slice(1, 3).join(".") ?? null;
}

const RADIO_NAME_NOISE = new Set(["uganda", "ug", "online", "the", "mp3", "aac", "live"]);

/**
 * Core name used to spot the same station listed several times:
 * "Capital FM - 91.3 FM (MP3)" and "Capital FM Uganda" both become "capital fm".
 */
function radioNameKey(name) {
  const words = displayRadioName(name)
    .split(/\s+-\s+/)[0]
    .toLowerCase()
    .replace(/\b\d+([.,]\d+)?\b/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !RADIO_NAME_NOISE.has(w));
  return words.join(" ") || slugify(name);
}

/**
 * Foreign stations that Radio Browser users have tagged as Ugandan. Matched on
 * the name; checked against the Uganda list only.
 */
const NOT_UGANDAN_NAME =
  /jamaica|sky ?news|\bnbc\b|\bcbn\b|sen sports|bahamas|dominican|nigeria|chennai|manchester|america|\bcnn\b|cbs news|nbc news|sky news|\blbc\b|talk ?sport|talk ?radio|\bsmooth\b|heart xmas|\btrace\b|dw news|\brfi\b|premier league|jewish|abdulbasit|capital fm uk|ancient faith|scripture for america|progressive radio network|us local news/i;
const NOT_UGANDAN_NAME_CASED = /\b(US|UK)\b/;

function titleCase(value) {
  return value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Radio Browser codecs we can't play as audio (unknown or video streams). */
function isUnplayableCodec(codec) {
  const c = (codec ?? "").toUpperCase();
  return !c || c === "UNKNOWN" || c.includes("H.264") || c.includes("H264");
}

/** Sort order for duplicates: more listeners, then more votes, then https. */
function compareRadioCandidates(a, b) {
  if (a.clickcount !== b.clickcount) return b.clickcount - a.clickcount;
  if (a.votes !== b.votes) return b.votes - a.votes;
  const https = (item) => (item.url_resolved.startsWith("https:") ? 1 : 0);
  return https(b) - https(a);
}

/**
 * Other stream URLs listed for the same station (Radio Browser often has
 * several entries per station). Tried in order when the primary URL fails.
 * Kept out of the station objects so they never reach stations.json.
 */
const ALTERNATE_STREAM_URLS = new Map();

async function fetchPreviousCatalog() {
  try {
    const res = await fetch(PREVIOUS_CATALOG, { signal: AbortSignal.timeout(15000) });
    const raw = res.ok ? await res.json() : null;
    if (Array.isArray(raw)) return raw;
  } catch {
    // first build, or the site is down: ids are still derived the same way
  }
  console.log("  Previous catalog unavailable; ids and carry-over skipped");
  return [];
}

function isNotUgandanName(name) {
  return NOT_UGANDAN_NAME.test(name) || NOT_UGANDAN_NAME_CASED.test(name);
}

/** @param {Array<object>} previous stations from the live catalog */
async function fetchRadioStations(previous) {
  console.log("  Fetching radio stations from radio-browser.info...");

  const headers = {
    "User-Agent": RADIO_USER_AGENT,
    Accept: "application/json",
  };

  // Mirrors come and go; ask the API which ones exist, de1 as the fallback.
  let servers = ["https://de1.api.radio-browser.info"];
  try {
    const res = await fetch("https://all.api.radio-browser.info/json/servers", {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const list = res.ok ? await res.json() : [];
    const names = [...new Set(list.map((s) => s?.name).filter(Boolean))];
    if (names.length > 0) servers = names.map((name) => `https://${name}`);
  } catch {
    // keep the fallback
  }

  // Each server in turn, then again after a pause: the API rate limits bursts.
  async function radioFetch(path) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 5000 * attempt));
      for (const server of servers) {
        try {
          const res = await fetch(`${server}${path}`, {
            headers,
            signal: AbortSignal.timeout(20000),
          });
          if (!res.ok) continue;
          const raw = await res.json();
          if (Array.isArray(raw) && raw.length > 0) return raw;
        } catch {
          // try next server
        }
      }
    }
    return [];
  }

  // One query at a time: parallel bursts get rate limited and come back empty.
  const ranked = "hidebroken=true&order=clickcount&reverse=true";
  async function query(label, path) {
    const items = await radioFetch(path);
    console.log(`    ${label}: ${items.length}`);
    return items;
  }
  const byCountry = (cc) =>
    query(cc, `/json/stations/bycountrycodeexact/${cc}?${ranked}`);

  const uganda = await byCountry("UG");
  // Refuse to build a catalog without Ugandan radio rather than ship a
  // degraded one (an empty answer means the API failed, not zero stations).
  if (uganda.length === 0) {
    throw new Error("radio-browser.info returned no Ugandan stations; try again later");
  }
  const eastAfrica = [];
  for (const cc of EAST_AFRICA_COUNTRIES) eastAfrica.push(await byCountry(cc));
  const international = await query(
    "international",
    `/json/stations/search?${ranked}&limit=${INTERNATIONAL_RADIO_POOL}`
  );
  if (international.length === 0) {
    throw new Error("radio-browser.info returned no international stations; try again later");
  }

  const drops = { unhealthy: 0, codec: 0, duplicate: 0, notUgandan: 0 };

  /**
   * Healthy, playable, one entry per name + country (best duplicate kept),
   * still ordered by listener count.
   */
  function clean(items) {
    const groups = new Map();
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const url = item.url_resolved?.trim();
      const name = item.name?.trim();
      if (!url || !name) continue;
      if (item.lastcheckok !== 1) {
        drops.unhealthy++;
        continue;
      }
      if (isUnplayableCodec(item.codec)) {
        drops.codec++;
        continue;
      }
      const cc = (item.countrycode ?? "").toUpperCase();
      const key = `${radioNameKey(name)}|${cc}`;
      const group = groups.get(key);
      if (group) {
        drops.duplicate++;
        group.push(item);
      } else {
        groups.set(key, [item]);
      }
    }

    // Same frequency and one core name inside the other is the same station
    // ("Akaboozi FM 87.9" and "87.9 Kaboozi Fm").
    const keys = [...groups.keys()];
    for (let i = 0; i < keys.length; i++) {
      const a = groups.get(keys[i]);
      if (!a) continue;
      const freqA = frequencyOf(a[0].name);
      if (!freqA) continue;
      const [coreA, ccA] = keys[i].split("|");
      for (let j = i + 1; j < keys.length; j++) {
        const b = groups.get(keys[j]);
        if (!b) continue;
        const [coreB, ccB] = keys[j].split("|");
        if (ccA !== ccB || !b.some((item) => frequencyOf(item.name) === freqA)) continue;
        if (!coreA.includes(coreB) && !coreB.includes(coreA)) continue;
        a.push(...b);
        drops.duplicate += b.length;
        groups.delete(keys[j]);
      }
    }

    return [...groups.values()]
      .map((group) => {
        group.sort(compareRadioCandidates);
        const [primary, ...rest] = group;
        primary.memberNames = group.map((item) => item.name.trim());
        primary.alternateUrls = [
          ...new Set(rest.map((item) => item.url_resolved.trim())),
        ].filter((url) => url !== primary.url_resolved.trim());
        return primary;
      })
      .sort((a, b) => b.clickcount - a.clickcount);
  }

  // Streams also listed under another country are foreign stations
  // re-tagged as Ugandan; so are the obvious names in NOT_UGANDAN_NAME.
  const foreignUrls = new Set(
    [...eastAfrica.flat(), ...international]
      .filter((item) => (item.countrycode ?? "").toUpperCase() !== "UG")
      .map((item) => item.url_resolved?.trim())
  );
  const ugandaOwn = uganda.filter((item) => {
    const name = item.name ?? "";
    const foreign = foreignUrls.has(item.url_resolved?.trim()) || isNotUgandanName(name);
    if (foreign) drops.notUgandan++;
    return !foreign;
  });

  const regional = new Set(["UG", ...EAST_AFRICA_COUNTRIES]);
  const perCountry = new Map();
  const intlPicked = [];
  for (const item of clean(international)) {
    const cc = (item.countrycode ?? "").toUpperCase();
    if (!cc || regional.has(cc)) continue;
    const count = perCountry.get(cc) ?? 0;
    if (count >= INTERNATIONAL_PER_COUNTRY_CAP) continue;
    perCountry.set(cc, count + 1);
    intlPicked.push(item);
    if (intlPicked.length >= INTERNATIONAL_RADIO_CAP) break;
  }

  const candidates = [
    ...clean(ugandaOwn),
    ...eastAfrica.flatMap((list) => clean(list).slice(0, EAST_AFRICA_PER_COUNTRY_CAP)),
    ...intlPicked,
  ];

  const previousIds = new Set(previous.map((s) => s.id));
  const previousIdByUrl = new Map(previous.map((s) => [s.streamUrl, s.id]));
  const stations = [];
  const seenUrls = new Set();
  const seenIds = new Set();
  for (const item of candidates) {
    const countryCode = (item.countrycode ?? "").toUpperCase() || "UG";
    const name = item.name.trim();
    const idFor = (n) => `radio-${slugify(n)}-${slugify(countryCode)}`;
    // Keep the id the station was shipped under before, matched by any of its
    // names or stream URLs (Radio Browser lists one stream under several names).
    const shippedId =
      item.memberNames.map(idFor).find((id) => previousIds.has(id)) ??
      [item.url_resolved.trim(), ...item.alternateUrls]
        .map((url) => previousIdByUrl.get(url))
        .find(Boolean);
    const categories = [
      ...new Set(
        (item.tags ?? "")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      ),
    ].slice(0, 5);
    const language = (item.language ?? "").split(",")[0].trim();

    const station = {
      id: shippedId ?? idFor(name),
      name: displayRadioName(name),
      type: "radio",
      streamUrl: item.url_resolved.trim(),
      logo: item.favicon && item.favicon !== "null" ? item.favicon : undefined,
      description: categories.join(", ") || "Radio station",
      language: language ? titleCase(language) : "English",
      country: countryCode,
      categories,
      website: httpUrlOrUndefined(item.homepage),
      isFeatured: false,
    };

    if (seenUrls.has(station.streamUrl) || seenIds.has(station.id)) {
      drops.duplicate++;
      continue;
    }
    seenUrls.add(station.streamUrl);
    seenIds.add(station.id);
    if (item.alternateUrls.length > 0) {
      ALTERNATE_STREAM_URLS.set(station.id, item.alternateUrls);
    }
    stations.push(station);
  }

  // Previously shipped radio stations that fell outside this run's caps stay,
  // as long as they still pass validation (mislabelled Uganda entries go).
  let carried = 0;
  for (const old of previous) {
    if (old?.type !== "radio" || !old.streamUrl) continue;
    if (seenIds.has(old.id) || seenUrls.has(old.streamUrl)) continue;
    if (old.country === "UG" && isNotUgandanName(old.name ?? "")) continue;
    seenIds.add(old.id);
    seenUrls.add(old.streamUrl);
    stations.push({ ...old, isFeatured: false });
    carried++;
  }

  console.log(
    `  radio-browser.info: ${stations.length} candidates, ${carried} carried over ` +
      `(dropped ${drops.unhealthy} failing health check, ${drops.codec} unplayable codec, ` +
      `${drops.duplicate} duplicates, ${drops.notUgandan} foreign stations tagged as Uganda)`
  );
  return stations;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Laba Station Builder ===\n");

  console.log("Step 1/3: Fetching stations...");
  const previous = await fetchPreviousCatalog();
  const [rawTv, rawRadio] = await Promise.all([
    fetchTvStations(),
    fetchRadioStations(previous),
  ]);
  console.log(
    `  Raw totals — TV: ${rawTv.length}, Radio: ${rawRadio.length}\n`
  );

  console.log("Step 2/3: Validating TV streams...");
  const validTv = await validateStreamUrls(rawTv, 50, 8000);
  console.log(`  TV: ${validTv.length}/${rawTv.length} streams working\n`);

  console.log("Step 3/3: Validating radio streams...");
  // Radio servers are spread over many hosts, so more parallelism is safe.
  const validRadio = await validateStreamUrls(rawRadio, 30, 10000, 16);
  console.log(
    `  Radio: ${validRadio.length}/${rawRadio.length} streams working\n`
  );

  // Merge supplement stations — only after validation (YouTube = live now;
  // direct CDN = same stream checks as API results).
  const validatedIds = new Set([...validTv, ...validRadio].map((s) => s.id));
  const validatedUrls = new Set(
    [...validTv, ...validRadio].map((s) => s.streamUrl).filter(Boolean)
  );

  const youtubeSupp = SUPPLEMENT_TV_STATIONS.filter((s) => s.youtubeChannelId);
  const directSupp = SUPPLEMENT_TV_STATIONS.filter(
    (s) => s.streamUrl && !s.youtubeChannelId
  );

  const youtubeCandidates = youtubeSupp.filter((s) => !validatedIds.has(s.id));
  const directCandidates = directSupp.filter(
    (s) => !validatedIds.has(s.id) && !validatedUrls.has(s.streamUrl)
  );

  // Run direct CDN and YouTube checks sequentially with modest concurrency so
  // we don't exhaust sockets right after validating hundreds of radio streams.
  console.log("Validating supplement stations (direct CDN, then YouTube live)...");
  const validDirectSupp = await validateStreamUrls(directCandidates, 3, 15000);
  const validYoutubeSupp = await validateYouTubeSupplements(
    youtubeCandidates,
    3,
    12000
  );

  console.log(
    `  Supplement: ${validYoutubeSupp.length}/${youtubeCandidates.length} YouTube live, ` +
      `${validDirectSupp.length}/${directCandidates.length} direct CDN working\n`
  );

  const supplemented = [...validYoutubeSupp, ...validDirectSupp];

  // A working alternate URL can match another station's stream; keep the first.
  const usedUrls = new Set();
  const all = [...validTv, ...supplemented, ...validRadio].filter((s) => {
    if (!s.streamUrl) return true;
    if (usedUrls.has(s.streamUrl)) return false;
    usedUrls.add(s.streamUrl);
    return true;
  });
  const ugTv = all.filter((s) => s.type === "tv" && s.country === "UG");
  const intlTv = all.filter((s) => s.type === "tv" && s.country !== "UG");
  const ugRadio = all.filter((s) => s.type === "radio" && s.country === "UG");
  const eaRadio = all.filter(
    (s) => s.type === "radio" && EAST_AFRICA_COUNTRIES.includes(s.country)
  );
  const intlRadio = all.filter(
    (s) =>
      s.type === "radio" &&
      s.country !== "UG" &&
      !EAST_AFRICA_COUNTRIES.includes(s.country)
  );

  // Radio candidates arrive ordered by listener count, so the first working
  // Ugandan stations are the most popular ones.
  for (const s of ugRadio.slice(0, FEATURED_UG_RADIO_COUNT)) s.isFeatured = true;

  console.log(`Total working stations: ${all.length}`);
  console.log(`  Uganda TV:        ${ugTv.length}`);
  console.log(`  International TV: ${intlTv.length}`);
  console.log(`  Uganda Radio:     ${ugRadio.length}`);
  console.log(`  East Africa Radio:   ${eaRadio.length}`);
  console.log(`  International Radio: ${intlRadio.length}`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

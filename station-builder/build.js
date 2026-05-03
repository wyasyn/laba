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
const RADIO_UGANDA =
  "https://de1.api.radio-browser.info/json/stations/bycountry/Uganda";
const RADIO_INTERNATIONAL =
  "https://de1.api.radio-browser.info/json/stations/search?limit=150&order=votes&reverse=true&hidebroken=true";

// User-Agent required by radio-browser.info to avoid being blocked
const RADIO_USER_AGENT = "Laba/1.0 (github.com/wyasyn/laba)";

// ─── Filtering constants ──────────────────────────────────────────────────────

const INTERNATIONAL_ENGLISH_CAP = 200;

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

async function probeStreamBody(url, timeoutMs) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok && res.status !== 206) return { ok: false, chunk: null, ct: "" };
    const ct = res.headers.get("content-type") ?? "";
    const ab = await res.arrayBuffer();
    const chunk = new Uint8Array(ab).slice(0, 512);
    return { ok: true, chunk, ct };
  } catch {
    return { ok: false, chunk: null, ct: "" };
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

async function validateStreamUrls(stations, batchSize = 50, timeoutMs = 8000) {
  const valid = [];
  const total = stations.length;
  let done = 0;
  // GET-based checks + some CDNs rate-limit heavy parallelism
  const effectiveBatch = Math.min(batchSize, 8);

  for (let i = 0; i < stations.length; i += effectiveBatch) {
    const batch = stations.slice(i, i + effectiveBatch);
    const results = await Promise.all(
      batch.map(async (station) => ({
        station,
        ok: await checkUrl(
          station.streamUrl,
          timeoutMs,
          station.type === "radio" ? "radio" : "tv"
        ),
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

async function fetchRadioStations() {
  console.log("  Fetching radio stations from radio-browser.info...");
  const stations = [];
  const seenUrls = new Set();
  const seenIds = new Set();

  const headers = {
    "User-Agent": RADIO_USER_AGENT,
    Accept: "application/json",
  };

  // Try multiple radio-browser.info servers in case one is down
  const servers = [
    "https://de1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info",
    "https://at1.api.radio-browser.info",
  ];

  async function radioFetch(path) {
    for (const server of servers) {
      try {
        const res = await fetch(`${server}${path}`, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return res;
      } catch {
        // try next server
      }
    }
    return null;
  }

  const [ugandaRes, intlRes] = await Promise.all([
    radioFetch("/json/stations/bycountry/Uganda"),
    radioFetch(
      "/json/stations/search?limit=150&order=votes&reverse=true&hidebroken=true&language=english"
    ),
  ]);

  for (const res of [ugandaRes, intlRes]) {
    if (!res) continue;

    let raw;
    try {
      raw = await res.json();
    } catch {
      continue;
    }

    if (!Array.isArray(raw)) continue;

    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const streamUrl = item.url_resolved?.trim();
      const name = item.name?.trim();
      if (!streamUrl || !name) continue;

      const countryCode = (item.countrycode ?? "").toUpperCase();
      const categories = item.tags
        ? item.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const station = {
        id: `radio-${slugify(name)}-${slugify(countryCode || "int")}`,
        name,
        type: "radio",
        streamUrl,
        logo: (item.favicon && item.favicon !== "null") ? item.favicon : undefined,
        description: categories.join(", ") || "Radio station",
        language: item.language || "English",
        country: countryCode || "UG",
        categories,
        website: item.homepage || undefined,
        isFeatured: countryCode === "UG",
      };

      if (seenUrls.has(station.streamUrl)) continue;
      if (seenIds.has(station.id)) continue;
      seenUrls.add(station.streamUrl);
      seenIds.add(station.id);
      stations.push(station);
    }
  }

  console.log(`  radio-browser.info: ${stations.length} stations found`);
  return stations;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Laba Station Builder ===\n");

  console.log("Step 1/3: Fetching stations...");
  const [rawTv, rawRadio] = await Promise.all([
    fetchTvStations(),
    fetchRadioStations(),
  ]);
  console.log(
    `  Raw totals — TV: ${rawTv.length}, Radio: ${rawRadio.length}\n`
  );

  console.log("Step 2/3: Validating TV streams...");
  const validTv = await validateStreamUrls(rawTv, 50, 8000);
  console.log(`  TV: ${validTv.length}/${rawTv.length} streams working\n`);

  console.log("Step 3/3: Validating radio streams...");
  const validRadio = await validateStreamUrls(rawRadio, 30, 8000);
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

  const all = [...validTv, ...supplemented, ...validRadio];
  const ugTv = all.filter((s) => s.type === "tv" && s.country === "UG");
  const intlTv = all.filter((s) => s.type === "tv" && s.country !== "UG");
  const ugRadio = all.filter((s) => s.type === "radio" && s.country === "UG");
  const intlRadio = all.filter((s) => s.type === "radio" && s.country !== "UG");

  console.log(`Total working stations: ${all.length}`);
  console.log(`  Uganda TV:        ${ugTv.length}`);
  console.log(`  International TV: ${intlTv.length}`);
  console.log(`  Uganda Radio:     ${ugRadio.length}`);
  console.log(`  International Radio: ${intlRadio.length}`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

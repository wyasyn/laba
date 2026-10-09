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
const IPTV_FEEDS = "https://iptv-org.github.io/api/feeds.json";
const IPTV_LOGOS = "https://iptv-org.github.io/api/logos.json";
const UGANDA_M3U = "https://iptv-org.github.io/iptv/countries/ug.m3u";
// The catalog the apps use today: its ids are kept stable (favourites and
// recents are stored by id) and its radio stations stay while they still work.
const PREVIOUS_CATALOG = "https://laba.yasinwalum.com/stations.json";

// User-Agent required by radio-browser.info to avoid being blocked
const RADIO_USER_AGENT = "Laba/1.0 (github.com/wyasyn/laba)";

// ─── Filtering constants ──────────────────────────────────────────────────────

// TV: every Ugandan channel with a public stream, a capped number per East
// African country, then English channels from elsewhere with well-known news
// channels first and a per-country cap.
const EAST_AFRICA_TV_PER_COUNTRY_CAP = 15;
const INTERNATIONAL_TV_CAP = 80;
const INTERNATIONAL_TV_PER_COUNTRY_CAP = 5;
const PRIORITY_TV_NAMES = [
  "al jazeera english", "bbc news", "dw", "france 24 english", "euronews",
  "africanews", "trt world", "cna", "nhk world", "sky news", "abc news",
  "cbs news", "nbc news", "bloomberg", "cgtn", "arirang", "wion", "sabc news",
  "enca", "channels", "arise news", "tvc news", "kbc", "citizen", "ntv kenya",
  "ktn", "k24", "nasa",
];
// Category order for the rest: news first.
const TV_CATEGORY_RANK = [
  "news", "documentary", "science", "education", "business", "kids", "sports",
  "general", "entertainment",
];
// iptv-org language codes (ISO 639-3) to the names the app shows.
const LANGUAGE_NAMES = {
  eng: "English", swa: "Swahili", lug: "Luganda", kin: "Kinyarwanda",
  run: "Kirundi", fra: "French", ara: "Arabic", spa: "Spanish", por: "Portuguese",
  deu: "German", hin: "Hindi", zho: "Chinese", jpn: "Japanese", kor: "Korean",
  rus: "Russian", tur: "Turkish", ita: "Italian", nld: "Dutch", lin: "Lingala",
};

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

// ─── TV supplements ───────────────────────────────────────────────────────────

// YouTube channels that broadcast live. Each id was checked against YouTube
// (official channel, not a fan re-upload). At build time a channel is added
// when it is live; once shipped it stays while the channel exists, because
// most local channels are live only for news hours. The app plays them with
// YouTube's embedded player. When the same channel has a working direct
// stream from iptv-org, that stream wins and the YouTube entry is skipped.
// [id, name, youtubeChannelId, country, language, categories, featured]
const YOUTUBE_TV_CHANNELS = [
  // Uganda
  ["ntv-uganda", "NTV Uganda", "UCwga1dPCqBddbtq5KYRii2g", "UG", "English", ["news", "entertainment"], true],
  ["nbs-tv", "NBS TV", "UCMSOrdwslAbPmN4w-Z74iyA", "UG", "English", ["news", "entertainment"], true],
  ["ubc-tv", "UBC TV", "UCvTflPL_YBQdrHcKFI5xdYg", "UG", "English", ["news", "general"], true],
  ["bukedde-tv", "Bukedde TV", "UCbL0amMi8Ggvtzrmq5W_xTQ", "UG", "Luganda", ["news", "entertainment"], true],
  ["bbs-terefayina", "BBS Terefayina", "UCrkQ4OlgtOQICQ4NFTExttw", "UG", "Luganda", ["news", "entertainment"], true],
  ["sanyuka-tv", "Sanyuka TV", "UCFGT4NnhoWYCB8pb-XPTQkA", "UG", "Luganda", ["entertainment"], false],
  ["spark-tv", "Spark TV", "UC6NjYHurvba2778xqDsd-5g", "UG", "English", ["entertainment"], false],
  ["urban-tv", "Urban TV", "UCNEvA5GEeJ9KuynQWHtcgXw", "UG", "English", ["entertainment"], false],
  ["pearl-magic-prime", "Pearl Magic Prime", "UC1dFlIxChczGfAZrfdP7Edw", "UG", "English", ["entertainment"], false],
  ["galaxy-tv", "Galaxy TV", "UCieXipFD2nEVKoJ7J_Rarow", "UG", "English", ["entertainment"], false],
  ["kingdom-tv", "Kingdom TV", "UCkP2CFxmoKUego_dzX2Ch2w", "UG", "English", ["religious"], false],
  ["salt-tv", "Salt TV", "UCJWxzCeGTFkX7OiGSaOpGbw", "UG", "English", ["religious"], false],
  ["tv-west", "TV West", "UCL8O1K8TK81uv75Fd6i6sJw", "UG", "Runyankore", ["news", "entertainment"], false],
  ["top-tv", "Top TV", "UC6Qi7b7SlhDKrc8XtRe1NzQ", "UG", "English", ["entertainment"], false],
  ["baba-tv", "Baba TV", "UCilQ77_bUV7m9fFAmyfB9hQ", "UG", "English", ["entertainment"], false],
  ["delta-tv", "Delta TV", "UCrfPzJhfFi13FBQ-CUQqKsA", "UG", "Luganda", ["entertainment"], false],
  // East Africa
  ["citizen-tv-kenya", "Citizen TV Kenya", "UChBQgieUidXV1CmDxSdRm3g", "KE", "English", ["news"], false],
  ["ntv-kenya", "NTV Kenya", "UCqBJ47FjJcl61fmSbcadAVg", "KE", "English", ["news"], false],
  ["ktn-news-kenya", "KTN News Kenya", "UCKVsdeoHExltrWMuK0hOWmg", "KE", "English", ["news"], false],
  ["k24-tv", "K24 TV", "UCt3SE-Mvs3WwP7UW-PiFdqQ", "KE", "English", ["news"], false],
  ["kbc-channel-1", "KBC Channel 1", "UCypNjM5hP1qcUqQZe57jNfg", "KE", "English", ["news", "general"], false],
  ["tv47-kenya", "TV47 Kenya", "UC_zA9UIWE1fB-jfFk_DBSYw", "KE", "Swahili", ["news"], false],
  ["clouds-tv", "Clouds TV", "UC6rj98Znu_n_42hRgaObFGA", "TZ", "Swahili", ["entertainment"], false],
  ["itv-tanzania", "ITV Tanzania", "UCRmReUqNqc-GSZeD48QKjhQ", "TZ", "Swahili", ["news"], false],
  ["wasafi-tv", "Wasafi TV", "UCJ__AKbzt6oJSGLZ7G790Zw", "TZ", "Swahili", ["entertainment", "music"], false],
  ["tbc-tanzania", "TBC Tanzania", "UCEz71zXmApKBYiH1fReemeA", "TZ", "Swahili", ["news", "general"], false],
  ["azam-tv", "Azam TV", "UCpHiA0taMn231yDiUeqoANw", "TZ", "Swahili", ["entertainment", "sports"], false],
  ["rwanda-tv", "Rwanda TV", "UCyRvjnhiC0MOXWS-7COPtyQ", "RW", "Kinyarwanda", ["news", "general"], false],
  ["tv1-rwanda", "TV1 Rwanda", "UCweH7GISNi4dkJLXtO1tqDQ", "RW", "Kinyarwanda", ["news", "entertainment"], false],
  ["ssbc-south-sudan", "SSBC South Sudan", "UCXG4tODjjS58Rd-zkdRUGzg", "SS", "English", ["news", "general"], false],
  ["rtnb-burundi", "RTNB Burundi", "UCIezoDoTPTETVTc9HRC05xg", "BI", "Kirundi", ["news", "general"], false],
  // Africa and international news
  ["africanews", "Africanews", "UC1_E8NeF5QHY2dtdLRBCCLA", "CG", "English", ["news"], false],
  ["sabc-news", "SABC News", "UC8yH-uI81UUtEMDsowQyx1g", "ZA", "English", ["news"], false],
  ["enca", "eNCA", "UCI3RT5PGmdi1KVp9FG_CneA", "ZA", "English", ["news"], false],
  ["channels-television", "Channels Television", "UCEXGDNclvmg6RW0vipJYsTQ", "NG", "English", ["news"], false],
  ["al-jazeera-english", "Al Jazeera English", "UCNye-wNBqNL5ZzHSJj3l8Bg", "QA", "English", ["news"], true],
  ["dw-english", "DW News", "UCknLrEdhRCp1aegoMqRaCZg", "DE", "English", ["news"], false],
  ["france-24-english", "France 24 English", "UCQfwfsi5VrQ8yKZ-UWmAEFg", "FR", "English", ["news"], false],
  ["euronews-english", "Euronews English", "UCSrZ3UV4jOidv8ppoVuvW9Q", "FR", "English", ["news"], false],
  ["sky-news", "Sky News", "UCoMdktPbSTixAyNGwb-UYkQ", "GB", "English", ["news"], false],
  ["trt-world", "TRT World", "UC7fWeaHhqgM4Ry-RMpM2YYw", "TR", "English", ["news"], false],
  ["cna", "CNA", "UC83jt4dlz1Gjl58fzQrrKZg", "SG", "English", ["news"], false],
  ["wion", "WION", "UC_gUM8rL-Lrg6O3adPW9K1g", "IN", "English", ["news"], false],
  ["abc-news", "ABC News", "UCBi2mrWuNuyYy4gbM6fU18Q", "US", "English", ["news"], false],
  ["abc-news-australia", "ABC News Australia", "UCVgO39Bk5sMo66-6o6Spn6Q", "AU", "English", ["news"], false],
  ["nbc-news", "NBC News", "UCeY0bbntWzzVIaj2z3QigXg", "US", "English", ["news"], false],
  ["cbs-news", "CBS News", "UC8p1vwvWtl6T73JiExfWs1g", "US", "English", ["news"], false],
  ["nasa", "NASA", "UCLA_DiR1FfKNvjuUpBHmylQ", "US", "English", ["science", "documentary"], false],
  ["al-jazeera-arabic", "Al Jazeera Arabic", "UCfiwzLy-8yKzIbsmZTzxDgw", "QA", "Arabic", ["news"], false],
].map(([id, name, youtubeChannelId, country, language, categories, isFeatured]) => ({
  id, name, type: "tv", youtubeChannelId, description: categories.join(", "),
  language, country, categories, isFeatured,
}));

// Official direct streams for big international channels, checked like any
// other stream. iptv-org usually has these too.
const SUPPLEMENT_TV_STATIONS = [
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
    // Only the headers matter here. A live stream ignores Range and would keep
    // downloading in the background, starving every check after it.
    res.body?.cancel().catch(() => {});

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

// YouTube answers a plain request with a consent page in some regions; these
// cookies skip it. A browser User-Agent gets the full page with its JSON.
const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "en-US",
  Cookie: "CONSENT=YES+1; SOCS=CAI",
};

/** The JSON object right after `marker` in a page, or null (string-aware brace matching). */
function extractJsonObject(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const from = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
    } else if (c === "{") {
      depth++;
    } else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(from, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * The channel's name and avatar from its home page. "missing" when YouTube
 * says the channel does not exist, "unknown" when the page could not be read
 * (network error, or a bot check on CI runners).
 */
async function fetchYouTubeChannel(channelId, timeoutMs) {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${channelId}`, {
      headers: YOUTUBE_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 404) return { status: "missing" };
    if (!res.ok) return { status: "unknown" };
    const html = await res.text();
    const meta = (property) =>
      html.match(new RegExp(`<meta property="og:${property}" content="([^"]*)"`))?.[1];
    const title = meta("title");
    if (!title) return { status: "unknown" };
    return { status: "ok", title, avatar: httpUrlOrUndefined(meta("image")) };
  } catch {
    return { status: "unknown" };
  }
}

/**
 * True when the channel is broadcasting right now. The /live page of a live
 * channel carries the stream's videoDetails with isLive; otherwise it shows the
 * channel page or an upcoming or past video. (The embed page can't be used: it
 * answers requests without a referrer with error 153.)
 */
async function isYouTubeChannelLive(channelId, timeoutMs) {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
      headers: YOUTUBE_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const details = extractJsonObject(await res.text(), '"videoDetails":');
    return details?.channelId === channelId && details.isLive === true;
  } catch {
    return false;
  }
}

/**
 * YouTube stations to ship: live now, or shipped before and the channel still
 * exists (local channels are live only part of the day, and the app shows
 * "not live right now" for those). Fills in the channel avatar as the logo.
 *
 * @param {Map<string, object>} previousByChannel shipped stations by youtubeChannelId
 */
async function validateYouTubeSupplements(stations, previousByChannel, timeoutMs = 20000) {
  const valid = [];
  let live = 0;
  let missing = 0;
  // One channel at a time: YouTube throttles bursts from one address.
  for (const station of stations) {
    const channel = await fetchYouTubeChannel(station.youtubeChannelId, timeoutMs);
    if (channel.status === "missing") {
      missing++;
      continue;
    }
    const previous = previousByChannel.get(station.youtubeChannelId);
    const isLive = await isYouTubeChannelLive(station.youtubeChannelId, timeoutMs);
    if (isLive) live++;
    if (!isLive && !previous) continue;
    valid.push({ ...station, logo: channel.avatar ?? previous?.logo ?? station.logo });
  }
  console.log(
    `  YouTube: ${valid.length}/${stations.length} kept (${live} live now, ` +
      `${valid.length - live} shipped before, ${missing} channels not found)`
  );
  return valid;
}

/**
 * Loose channel name for spotting one channel listed twice: "Bukedde TV 1"
 * becomes "bukedde 1", "BBS TV" becomes "bbs".
 */
function tvNameKey(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !["tv", "television", "channel", "live", "hd", "the", "english", "news"].includes(w))
    .join(" ");
}

/** Same channel when one key equals or extends the other ("bukedde" / "bukedde 1"). */
function isSameTvChannel(a, b) {
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
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

const QUALITY_RANK = (stream) => Number.parseInt(stream.quality ?? "", 10) || 0;

function tvRank(channel) {
  const name = channel.name.toLowerCase();
  const priority = PRIORITY_TV_NAMES.findIndex((p) => name.startsWith(p));
  const categoryRanks = (channel.categories ?? [])
    .map((c) => TV_CATEGORY_RANK.indexOf(c))
    .filter((r) => r >= 0);
  return [
    priority >= 0 ? priority : PRIORITY_TV_NAMES.length,
    categoryRanks.length ? Math.min(...categoryRanks) : TV_CATEGORY_RANK.length,
  ];
}

function compareTvChannels(a, b) {
  const [pa, ca] = tvRank(a);
  const [pb, cb] = tvRank(b);
  return pa - pb || ca - cb || a.name.localeCompare(b.name);
}

/**
 * TV from the iptv-org API. Languages live on feeds and logos in their own
 * list (the channel entries no longer carry them).
 */
async function fetchIptvStations() {
  const fetchJson = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  };
  const [channels, streams, feeds, logos] = await Promise.all(
    [IPTV_CHANNELS, IPTV_STREAMS, IPTV_FEEDS, IPTV_LOGOS].map(fetchJson)
  );

  const channelById = new Map(channels.map((c) => [c.id, c]));

  const languagesByFeed = new Map();
  const mainLanguages = new Map();
  for (const feed of feeds) {
    const langs = Array.isArray(feed.languages) ? feed.languages : [];
    languagesByFeed.set(`${feed.channel}@${feed.id}`, langs);
    if (feed.is_main || !mainLanguages.has(feed.channel)) mainLanguages.set(feed.channel, langs);
  }

  // A channel-wide logo in use beats a feed-specific one.
  const logoByChannel = new Map();
  for (const logo of logos) {
    if (!logo.in_use || typeof logo.url !== "string") continue;
    if (!logoByChannel.has(logo.channel) || logo.feed === null) {
      logoByChannel.set(logo.channel, logo.url);
    }
  }

  const streamsByChannel = new Map();
  let needsHeaders = 0;
  for (const stream of streams) {
    if (!stream?.channel || typeof stream.url !== "string") continue;
    if (!/^https?:\/\//.test(stream.url)) continue;
    // The apps can't send a custom User-Agent or Referer with a stream.
    if (stream.user_agent || stream.referrer) {
      needsHeaders++;
      continue;
    }
    const list = streamsByChannel.get(stream.channel) ?? [];
    list.push(stream);
    streamsByChannel.set(stream.channel, list);
  }

  const uganda = [];
  const eastAfrica = new Map(EAST_AFRICA_COUNTRIES.map((cc) => [cc, []]));
  const international = [];
  for (const [channelId, list] of streamsByChannel) {
    const channel = channelById.get(channelId);
    if (!channel || channel.closed || channel.is_nsfw) continue;
    const feedLangs = list.flatMap((s) => languagesByFeed.get(`${channelId}@${s.feed}`) ?? []);
    const languages = feedLangs.length ? feedLangs : mainLanguages.get(channelId) ?? [];
    const entry = { channel, streams: list, languages };

    if (channel.country === "UG") uganda.push(entry);
    else if (eastAfrica.has(channel.country)) eastAfrica.get(channel.country).push(entry);
    else if (
      languages.includes("eng") &&
      (channel.categories ?? []).some((c) => WANTED_TV_CATEGORIES.has(c))
    ) {
      international.push(entry);
    }
  }

  const byRank = (x, y) => compareTvChannels(x.channel, y.channel);
  const perCountry = new Map();
  const intlPicked = [];
  // One channel per family ("ABC News Live 1", "ABC News Live 2", "Sky News
  // Extra 3"), so sub-feeds don't use up a country's places.
  const families = new Set();
  for (const entry of international.sort(byRank)) {
    const family = tvNameKey(entry.channel.name)
      .split(" ")
      .filter((w) => !/^\d+$/.test(w) && w !== "extra")
      .join(" ");
    if (families.has(family)) continue;
    families.add(family);
    const cc = entry.channel.country;
    const count = perCountry.get(cc) ?? 0;
    if (count >= INTERNATIONAL_TV_PER_COUNTRY_CAP) continue;
    perCountry.set(cc, count + 1);
    intlPicked.push(entry);
    if (intlPicked.length >= INTERNATIONAL_TV_CAP) break;
  }

  const picked = [
    ...uganda.sort(byRank),
    ...[...eastAfrica.values()].flatMap((list) =>
      list.sort(byRank).slice(0, EAST_AFRICA_TV_PER_COUNTRY_CAP)
    ),
    ...intlPicked,
  ];

  const stations = [];
  for (const { channel, streams: list, languages } of picked) {
    const ordered = [...list].sort((x, y) => QUALITY_RANK(y) - QUALITY_RANK(x));
    const [best, ...rest] = ordered;
    const categories = channel.categories ?? [];
    const id = slugify(channel.name);
    const language = languages[0];
    stations.push({
      id,
      name: channel.name,
      type: inferType(categories),
      logo: logoByChannel.get(channel.id),
      streamUrl: best.url,
      description: categories.join(", ") || "Live channel",
      language: LANGUAGE_NAMES[language] ?? (language ? titleCase(language) : "English"),
      country: channel.country,
      categories,
      website: httpUrlOrUndefined(channel.website),
      isFeatured: channel.country === "UG",
    });
    const alternates = [...new Set(rest.map((s) => s.url))].filter((u) => u !== best.url);
    if (alternates.length) ALTERNATE_STREAM_URLS.set(id, alternates);
  }

  console.log(
    `  iptv-org: ${uganda.length} Uganda, ` +
      `${[...eastAfrica.values()].reduce((n, l) => n + l.length, 0)} East Africa, ` +
      `${intlPicked.length}/${international.length} international channels picked ` +
      `(${needsHeaders} streams skipped: need custom headers)`
  );
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
    for (const s of await fetchIptvStations()) {
      if (!seenIds.has(s.id) && !seenUrls.has(s.streamUrl)) {
        seenIds.add(s.id);
        seenUrls.add(s.streamUrl);
        stations.push(s);
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

  // Supplements, only after validation: direct streams get the same checks as
  // API results; YouTube channels are kept per validateYouTubeSupplements.
  const validatedIds = new Set([...validTv, ...validRadio].map((s) => s.id));
  const validatedUrls = new Set(
    [...validTv, ...validRadio].map((s) => s.streamUrl).filter(Boolean)
  );

  const directCandidates = SUPPLEMENT_TV_STATIONS.filter(
    (s) => !validatedIds.has(s.id) && !validatedUrls.has(s.streamUrl)
  );

  // Run direct CDN and YouTube checks sequentially with modest concurrency so
  // we don't exhaust sockets right after validating hundreds of radio streams.
  console.log("Validating supplement stations (direct CDN, then YouTube)...");
  const validDirectSupp = await validateStreamUrls(directCandidates, 3, 15000);
  console.log(
    `  Direct CDN: ${validDirectSupp.length}/${directCandidates.length} working`
  );

  // A working direct stream of the same channel beats the YouTube embed.
  const directTv = [...validTv, ...validDirectSupp];
  const directIds = new Set(directTv.map((s) => s.id));
  const directKeys = directTv.map((s) => tvNameKey(s.name));
  const youtubeCandidates = YOUTUBE_TV_CHANNELS.filter((s) => {
    const key = tvNameKey(s.name);
    return !directIds.has(s.id) && !directKeys.some((k) => isSameTvChannel(k, key));
  });
  const previousByChannel = new Map(
    previous.filter((s) => s?.youtubeChannelId).map((s) => [s.youtubeChannelId, s])
  );
  const validYoutubeSupp = await validateYouTubeSupplements(
    youtubeCandidates,
    previousByChannel
  );
  console.log("");

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
  const eaTv = all.filter(
    (s) => s.type === "tv" && EAST_AFRICA_COUNTRIES.includes(s.country)
  );
  const intlTv = all.filter(
    (s) =>
      s.type === "tv" && s.country !== "UG" && !EAST_AFRICA_COUNTRIES.includes(s.country)
  );
  const youtubeTv = all.filter((s) => s.youtubeChannelId);
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
  console.log(`  East Africa TV:   ${eaTv.length}`);
  console.log(`  International TV: ${intlTv.length}`);
  console.log(`  (YouTube TV:      ${youtubeTv.length})`);
  console.log(`  Uganda Radio:     ${ugRadio.length}`);
  console.log(`  East Africa Radio:   ${eaRadio.length}`);
  console.log(`  International Radio: ${intlRadio.length}`);

  // A run on a bad network finds most streams "dead". Publishing that would wipe
  // the catalog for every user, so keep the live one instead.
  for (const type of ["radio", "tv"]) {
    const before = previous.filter((s) => s?.type === type).length;
    const now = all.filter((s) => s.type === type).length;
    if (before > 0 && now < before * 0.5) {
      throw new Error(
        `Only ${now} ${type} stations work, the live catalog has ${before}; ` +
          "refusing to publish a degraded catalog"
      );
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

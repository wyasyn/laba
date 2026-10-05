import type { AudioStatus } from "expo-audio";

/**
 * Our expo-audio patch (patches/expo-audio.patch) adds the stream's ICY
 * StreamTitle to the status on Android. Some stations pack extra fields
 * separated by "|" (album, artwork URL, store link): keep the first two
 * readable ones. Placeholder values ("-", "Unknown", a bare URL) are dropped.
 */
export function streamTitleOf(status: AudioStatus) {
  const raw = (status as AudioStatus & { streamTitle?: string | null }).streamTitle;
  if (!raw) return null;
  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !/^https?:\/\//i.test(p));
  const title = parts.slice(0, 2).join(" · ");
  if (title.length < 3 || /^(-|unknown|n\/a)$/i.test(title)) return null;
  return title;
}

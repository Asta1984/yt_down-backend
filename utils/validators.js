export function sanitizeFilename(name) {
  if (!name || typeof name !== "string") return null;

  const cleaned = name
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, "")
    .trim()
    .slice(0, 150);

  return cleaned.length > 0 ? cleaned : null;
}

export function validateUrl(url) {

    if (!url) {
        throw {
            status: 400,
            message: "URL is required"
        };
    }

    let parsed;

    try {
        parsed = new URL(url);
    } catch {
        throw {
            status: 400,
            message: "Invalid URL"
        };
    }

    if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
    ) {
        throw {
            status: 400,
            message: "Only HTTP/HTTPS URLs are allowed"
        };
    }
}
// Allows plain ids ("137"), compound video+audio selectors ("137+bestaudio/best"),
// and yt-dlp keywords (best, bestaudio, bestvideo). Blocks anything with spaces,
// quotes, or shell-ish characters that has no business being in a format selector.
const FORMAT_ID_PATTERN = /^[a-zA-Z0-9_.\-\/+\[\]<>=]+$/;
 
export function validateFormatId(formatId) {
    if (!formatId || typeof formatId !== "string") {
        throw {
            status: 400,
            message: "formatId is required"
        };
    }
 
    if (formatId.length > 100 || !FORMAT_ID_PATTERN.test(formatId)) {
        throw {
            status: 400,
            message: "Invalid formatId"
        };
    }
}
 
// Mirrors AudioTarget in the frontend's src/lib/format.ts — keep in sync.
const ALLOWED_AUDIO_FORMATS = new Set(["m4a", "mp3", "opus", "vorbis", "flac", "wav"]);
 
// Returns a safe value to actually use (falls back to "mp3" for anything
// missing/invalid) rather than throwing, since this only affects an
// optional quality optimization, not whether the download can proceed.
export function resolveAudioFormat(audioFormat) {
    if (typeof audioFormat === "string" && ALLOWED_AUDIO_FORMATS.has(audioFormat)) {
        return audioFormat;
    }
    return "mp3";
}
import { ApiError } from './api-error';

/**
 * Accepts the common YouTube URL shapes and returns the 11-character video id.
 *
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/live/VIDEO_ID
 */
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractVideoId(rawUrl: string): string {
  const url = rawUrl.trim();

  // Bare id pasted directly.
  if (VIDEO_ID_RE.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw ApiError.badRequest('The provided value is not a valid URL.');
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const isYouTubeHost =
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be' ||
    host === 'youtube-nocookie.com';

  if (!isYouTubeHost) {
    throw ApiError.badRequest('The URL does not point to youtube.com or youtu.be.');
  }

  let candidate: string | null = null;

  if (host === 'youtu.be') {
    candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (parsed.pathname === '/watch') {
    candidate = parsed.searchParams.get('v');
  } else {
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
      candidate = segments[1];
    }
  }

  if (!candidate || !VIDEO_ID_RE.test(candidate)) {
    throw ApiError.badRequest('Could not extract a valid YouTube video id from the URL.');
  }

  return candidate;
}

/** True when a string looks like a usable YouTube URL / id (no throw). */
export function isYouTubeUrl(rawUrl: string): boolean {
  try {
    extractVideoId(rawUrl);
    return true;
  } catch {
    return false;
  }
}

export function canonicalVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

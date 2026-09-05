/** Client-side mirror of the backend URL validation (kept deliberately lenient). */
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractVideoId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (VIDEO_ID_RE.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
    return null;
  }

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && VIDEO_ID_RE.test(id) ? id : null;
  }
  if (url.pathname === '/watch') {
    const id = url.searchParams.get('v');
    return id && VIDEO_ID_RE.test(id) ? id : null;
  }
  const seg = url.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(seg[0]) && VIDEO_ID_RE.test(seg[1])) {
    return seg[1];
  }
  return null;
}

export function isValidYouTubeUrl(raw: string): boolean {
  return extractVideoId(raw) !== null;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

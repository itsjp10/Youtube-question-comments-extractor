/** Small text helpers shared by the heuristic provider and comment cleaning. */

/** Strip diacritics: "cómo estás" -> "como estas". */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Lowercase, de-accent, drop punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return stripAccents(input.toLowerCase())
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove HTML tags and decode the handful of entities the YouTube API emits. */
export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/** Collapse whitespace / newlines and trim. */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set(
  (
    'de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si ' +
    'porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno ' +
    'les ni contra otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra el tanto esa ' +
    'estos mucho quienes nada muchos cual sea poco ella estar haber estas estaba estamos algunas algo nosotros ' +
    'the a an and or of to in is it for on with as at this that be by are was so i you my we he she they them ' +
    'have has do does did will would can could should our your me not but if then than too very just about'
  ).split(/\s+/),
);

/** Content words only (accent-stripped, length >= 3, no stopwords). */
export function contentTokens(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** FNV-1a 32-bit hash, used to bucket lexical features into a fixed vector. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

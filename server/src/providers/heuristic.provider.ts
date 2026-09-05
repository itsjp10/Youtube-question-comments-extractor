import type { AIProvider } from './ai-provider.interface';
import type { CommentClassification, CommentIntent } from '../types';
import { contentTokens, fnv1a, normalizeText, stripAccents } from '../utils/text';

const EMBEDDING_DIM = 512;

/** Ordered rule set. First matching group wins (SPAM checked first). */
const PATTERNS: Array<{ intent: CommentIntent; re: RegExp; confidence: number }> = [
  {
    intent: 'SPAM',
    confidence: 0.9,
    re: /(suscr[ií]b|sub to my|subscribe to my|check out my|gana dinero|free money|ganar dinero|promo code|c[oó]digo promo|only ?fans|t\.me\/|wa\.me\/|whatsapp \+?\d|telegram|bit\.ly|earn \$|make money online)/i,
  },
  {
    intent: 'PROBLEM',
    confidence: 0.88,
    re: /(no me funciona|no funciona|no sirve|no me sirve|no puedo|no logro|no consigo|no me deja|me sale error|me da error|sale un error|no entiend|no entend[ií]|no me queda claro|no comprend|tengo un problema|me marca error|no me carga|no me aparece|se me traba|no jala|doesn'?t work|does not work|not working|isn'?t working|can'?t get|cannot get|i'?m stuck|im stuck|keeps failing|throws an error|getting an error|broken)/i,
  },
  {
    intent: 'REQUEST',
    confidence: 0.8,
    re: /(podr[ií]as?|pudieras|puedes hacer|pueden hacer|podr[ií]an hacer|ser[ií]a genial si|me gustar[ií]a que|hac[eé] un video|haz un video|har[ií]as un video|puedes explicar|podr[ií]as explicar|explica(?:r|me)?|expl[ií]came|ens[eé][ñn]a(?:r|me)?|mu[eé]stra(?:me)?|tutorial de|please make|could you (?:make|do|explain|show)|can you (?:make|do|explain|show)|would love a (?:video|tutorial)|do a video on)/i,
  },
  {
    intent: 'QUESTION',
    confidence: 0.72,
    re: /(^|\s)(c[oó]mo|qu[eé]|cu[aá]l|cu[aá]ndo|d[oó]nde|por qu[eé]|para qu[eé]|qui[eé]n|se puede|hay (?:alguna|alguien)|alguien sabe|alguna forma|es posible|how (?:do|can|to|does)|what(?:'?s| is| are)|why (?:is|do|does|can'?t)|when (?:is|will|does)|where (?:do|can|is)|which |is there|are there|any way to|anyone know)/i,
  },
  {
    intent: 'THANKS',
    confidence: 0.9,
    re: /(muchas gracias|mil gracias|gracias por|te agradezco|excelente (?:video|tutorial|explicaci[oó]n)|gran (?:video|tutorial)|muy [uú]til|me sirvi[oó] much[ií]simo|buen[ií]simo video|thank you|thanks a lot|thank u|thx|great (?:video|tutorial|explanation)|really helpful|this helped|nice video)/i,
  },
  {
    intent: 'OPINION',
    confidence: 0.55,
    re: /(creo que|en mi opini[oó]n|me parece|pienso que|opino que|i think|in my opinion|imo|honestly|para m[ií])/i,
  },
];

function classifyOne(text: string): { intent: CommentIntent; confidence: number } {
  const raw = text.trim();
  const norm = ` ${stripAccents(raw.toLowerCase())} `;

  if (raw.length === 0) return { intent: 'OTHER', confidence: 0.9 };

  const hasQuestionMark = /[?¿]/.test(raw);

  for (const p of PATTERNS) {
    if (p.re.test(norm)) {
      // A question mark reinforces a QUESTION but should not override a stated problem.
      if (p.intent === 'QUESTION' && !hasQuestionMark) {
        return { intent: 'QUESTION', confidence: 0.6 };
      }
      return { intent: p.intent, confidence: p.confidence };
    }
  }

  if (hasQuestionMark) return { intent: 'QUESTION', confidence: 0.6 };

  const words = normalizeText(raw).split(' ').filter(Boolean);
  if (words.length <= 2) return { intent: 'OTHER', confidence: 0.7 };
  return { intent: 'OPINION', confidence: 0.4 };
}

/** Deterministic sparse lexical embedding: hashed tokens + char 3-grams, L2-normalised. */
function lexicalEmbedding(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  const tokens = contentTokens(text);

  const add = (feature: string, weight: number) => {
    vec[fnv1a(feature) % EMBEDDING_DIM] += weight;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    add(`w:${t}`, 1);
    if (i > 0) add(`b:${tokens[i - 1]}_${t}`, 0.6);
    for (let j = 0; j + 3 <= t.length; j++) add(`c:${t.slice(j, j + 3)}`, 0.5);
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

/**
 * Zero-dependency provider. Rule-based intent detection + hashed lexical
 * embeddings + a "most central comment" representative question. Lets the whole
 * pipeline run with no API keys; swap `AI_PROVIDER` for real quality.
 */
export class HeuristicProvider implements AIProvider {
  readonly name = 'heuristic';
  readonly embeddingKind = 'lexical' as const;
  // Lexical vectors: paraphrase cosine is far lower than a real embedding model.
  // Tuned so "tabla dinámica" variants group without pulling in unrelated words.
  readonly defaultSimilarityThreshold = 0.36;

  async classifyComments(comments: string[]): Promise<CommentClassification[]> {
    return comments.map((text, index) => {
      const { intent, confidence } = classifyOne(text);
      return { index, intent, confidence };
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return lexicalEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((t) => lexicalEmbedding(t));
  }

  async generateRepresentativeQuestion(comments: string[]): Promise<string> {
    if (comments.length === 0) return 'Pregunta frecuente';

    // Centroid of the group's lexical embeddings.
    const vectors = comments.map((c) => lexicalEmbedding(c));
    const centroid = new Array(EMBEDDING_DIM).fill(0);
    for (const v of vectors) for (let i = 0; i < EMBEDDING_DIM; i++) centroid[i] += v[i] / vectors.length;

    // Pick the comment closest to the centroid, preferring reasonable length.
    let best = 0;
    let bestScore = -Infinity;
    comments.forEach((c, i) => {
      let dot = 0;
      for (let k = 0; k < EMBEDDING_DIM; k++) dot += vectors[i][k] * centroid[k];
      const len = c.trim().length;
      const lengthPenalty = len < 12 ? -0.3 : len > 160 ? -0.2 : 0;
      const score = dot + lengthPenalty;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });

    return toQuestion(comments[best]);
  }
}

/** Normalise a raw comment into something that reads as a question. */
function toQuestion(raw: string): string {
  let s = raw.trim().replace(/\s+/g, ' ');
  if (s.length > 140) s = `${s.slice(0, 137).trimEnd()}…`;

  s = s.charAt(0).toUpperCase() + s.slice(1);

  const looksSpanish = /\b(como|que|cual|cuando|donde|por que|porque|puedo|puede|no entiendo|ayuda|forma|hacer)\b/i.test(
    stripAccents(s.toLowerCase()),
  );

  const endsWithQuestion = /[?？]\s*$/.test(s);
  if (!endsWithQuestion) s = `${s.replace(/[.…]+$/, '')}?`;
  if (looksSpanish && !s.startsWith('¿')) s = `¿${s}`;
  return s;
}

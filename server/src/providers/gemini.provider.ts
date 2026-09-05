import type { AIProvider } from './ai-provider.interface';
import type { CommentClassification, CommentIntent } from '../types';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const VALID_INTENTS: CommentIntent[] = [
  'QUESTION',
  'PROBLEM',
  'REQUEST',
  'OPINION',
  'THANKS',
  'SPAM',
  'OTHER',
];

interface GeminiProviderOptions {
  apiKey: string;
  chatModel?: string;
  embeddingModel?: string;
}

/**
 * Google Gemini implementation via the Generative Language REST API.
 * Classification / representative questions use `:generateContent`; embeddings
 * use `:batchEmbedContents`.
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly embeddingKind = 'semantic' as const;

  private readonly apiKey: string;
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  constructor(opts: GeminiProviderOptions) {
    if (!opts.apiKey) {
      throw ApiError.internal('AI_API_KEY is required when AI_PROVIDER=gemini');
    }
    this.apiKey = opts.apiKey;
    this.chatModel = opts.chatModel?.trim() || 'gemini-1.5-flash';
    this.embeddingModel = opts.embeddingModel?.trim() || 'text-embedding-004';
  }

  async classifyComments(comments: string[]): Promise<CommentClassification[]> {
    if (comments.length === 0) return [];

    const numbered = comments
      .map((c, i) => `${i}. ${c.replace(/\s+/g, ' ').slice(0, 500)}`)
      .join('\n');

    const prompt =
      'Classify each YouTube comment (mostly Spanish) by intent. ' +
      'Categories: QUESTION, PROBLEM (a difficulty/error, e.g. "no entiendo", "no me funciona"), ' +
      'REQUEST (asking the creator to make/explain something), OPINION, THANKS, SPAM, OTHER. ' +
      'Return ONLY minified JSON: {"items":[{"index":0,"intent":"QUESTION","confidence":0.9}]} for every index.\n\n' +
      numbered;

    const text = await this.generate(prompt, true);
    return parseClassifications(text, comments.length);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [vec] = await this.generateEmbeddings([text]);
    return vec;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const model = `models/${this.embeddingModel}`;
    const res = await this.fetchJson(
      `${BASE_URL}/${model}:batchEmbedContents`,
      {
        requests: texts.map((t) => ({
          model,
          content: { parts: [{ text: t.replace(/\s+/g, ' ').slice(0, 2000) || ' ' }] },
        })),
      },
    );
    const embeddings = (res as { embeddings?: Array<{ values: number[] }> }).embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw ApiError.badGateway('Gemini returned a mismatched number of embeddings');
    }
    return embeddings.map((e) => e.values);
  }

  async generateRepresentativeQuestion(comments: string[]): Promise<string> {
    if (comments.length === 0) return 'Pregunta frecuente';
    const sample = comments
      .slice(0, 12)
      .map((c) => `- ${c.replace(/\s+/g, ' ').slice(0, 300)}`)
      .join('\n');
    const prompt =
      'These YouTube comments share the same doubt. Write ONE clear representative question ' +
      '(max 15 words) in the same language as the comments (usually Spanish). ' +
      'Reply with only the question.\n\n' +
      sample;
    const text = await this.generate(prompt, false);
    return text.trim().replace(/^["']|["']$/g, '').slice(0, 200) || 'Pregunta frecuente';
  }

  private async generate(prompt: string, json: boolean): Promise<string> {
    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const res = await this.fetchJson(
      `${BASE_URL}/models/${this.chatModel}:generateContent`,
      body,
    );
    const text = (
      res as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    ).candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw ApiError.badGateway('Gemini returned an empty response');
    return text;
  }

  private async fetchJson(url: string, body: unknown): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw ApiError.badGateway(`Could not reach Gemini: ${(err as Error).message}`);
    }

    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; status?: string };
    };

    if (!res.ok) {
      const message = payload.error?.message ?? `Gemini request failed (HTTP ${res.status})`;
      if (res.status === 400 && /API key/i.test(message)) {
        throw ApiError.badGateway('Gemini rejected the API key.');
      }
      if (res.status === 429) throw ApiError.badGateway('Gemini rate limit / quota exceeded (429).');
      throw ApiError.badGateway(message);
    }
    if (env.LOG_AI_CALLS) console.info(`[gemini] ${url} ok`);
    return payload;
  }
}

function parseClassifications(content: string, expected: number): CommentClassification[] {
  const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw ApiError.badGateway('Gemini classification response was not valid JSON');
  }

  const items =
    (parsed as { items?: unknown[] }).items ??
    (Array.isArray(parsed) ? (parsed as unknown[]) : []);

  const byIndex = new Map<number, CommentClassification>();
  for (const item of items as Array<Record<string, unknown>>) {
    const index = Number(item.index);
    if (!Number.isInteger(index) || index < 0 || index >= expected) continue;
    const intentRaw = String(item.intent ?? 'OTHER').toUpperCase() as CommentIntent;
    const intent = VALID_INTENTS.includes(intentRaw) ? intentRaw : 'OTHER';
    let confidence = Number(item.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    confidence = Math.min(1, Math.max(0, confidence));
    byIndex.set(index, { index, intent, confidence });
  }

  return Array.from({ length: expected }, (_, index) =>
    byIndex.get(index) ?? { index, intent: 'OTHER' as CommentIntent, confidence: 0.3 },
  );
}

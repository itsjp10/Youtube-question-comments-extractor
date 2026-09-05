import type { AIProvider } from './ai-provider.interface';
import type { CommentClassification, CommentIntent } from '../types';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';

const BASE_URL = 'https://api.openai.com/v1';
const VALID_INTENTS: CommentIntent[] = [
  'QUESTION',
  'PROBLEM',
  'REQUEST',
  'OPINION',
  'THANKS',
  'SPAM',
  'OTHER',
];

interface OpenAIProviderOptions {
  apiKey: string;
  chatModel?: string;
  embeddingModel?: string;
}

/**
 * OpenAI implementation. Uses Chat Completions (JSON mode) for classification /
 * representative questions and the embeddings endpoint (native batching).
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly embeddingKind = 'semantic' as const;

  private readonly apiKey: string;
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  constructor(opts: OpenAIProviderOptions) {
    if (!opts.apiKey) {
      throw ApiError.internal('AI_API_KEY is required when AI_PROVIDER=openai');
    }
    this.apiKey = opts.apiKey;
    this.chatModel = opts.chatModel?.trim() || 'gpt-4o-mini';
    this.embeddingModel = opts.embeddingModel?.trim() || 'text-embedding-3-small';
  }

  async classifyComments(comments: string[]): Promise<CommentClassification[]> {
    if (comments.length === 0) return [];

    const numbered = comments
      .map((c, i) => `${i}. ${c.replace(/\s+/g, ' ').slice(0, 500)}`)
      .join('\n');

    const content = await this.chat(
      [
        {
          role: 'system',
          content:
            'You classify YouTube comments (mostly Spanish) by intent. ' +
            'Categories: QUESTION (asks something), PROBLEM (reports a difficulty/error/"no entiendo"), ' +
            'REQUEST (asks the creator to make/explain something), OPINION, THANKS, SPAM, OTHER. ' +
            'Treat "no entendí cómo...", "no me funciona..." as PROBLEM even without a question mark. ' +
            'Respond ONLY as JSON: {"items":[{"index":number,"intent":string,"confidence":number}]} covering every index.',
        },
        { role: 'user', content: numbered },
      ],
      true,
    );

    return parseClassifications(content, comments.length);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [vec] = await this.generateEmbeddings([text]);
    return vec;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.fetchJson(`${BASE_URL}/embeddings`, {
      model: this.embeddingModel,
      input: texts.map((t) => t.replace(/\s+/g, ' ').slice(0, 2000) || ' '),
    });
    const data = (res as { data?: Array<{ embedding: number[]; index: number }> }).data ?? [];
    return data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  async generateRepresentativeQuestion(comments: string[]): Promise<string> {
    if (comments.length === 0) return 'Pregunta frecuente';
    const sample = comments.slice(0, 12).map((c) => `- ${c.replace(/\s+/g, ' ').slice(0, 300)}`).join('\n');
    const content = await this.chat(
      [
        {
          role: 'system',
          content:
            'You are given several YouTube comments that share the same doubt. ' +
            'Write ONE clear representative question (max 15 words), in the same language as the comments ' +
            '(usually Spanish). Reply with only the question text.',
        },
        { role: 'user', content: sample },
      ],
      false,
    );
    return content.trim().replace(/^["']|["']$/g, '').slice(0, 200) || 'Pregunta frecuente';
  }

  private async chat(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    json: boolean,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.chatModel,
      messages,
      temperature: 0.2,
    };
    if (json) body.response_format = { type: 'json_object' };

    const res = await this.fetchJson(`${BASE_URL}/chat/completions`, body);
    const text = (res as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message
      ?.content;
    if (!text) throw ApiError.badGateway('OpenAI returned an empty response');
    return text;
  }

  private async fetchJson(url: string, body: unknown): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw ApiError.badGateway(`Could not reach OpenAI: ${(err as Error).message}`);
    }

    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };

    if (!res.ok) {
      const message = payload.error?.message ?? `OpenAI request failed (HTTP ${res.status})`;
      if (res.status === 401) throw ApiError.badGateway('OpenAI rejected the API key (401).');
      if (res.status === 429) throw ApiError.badGateway('OpenAI rate limit / quota exceeded (429).');
      throw ApiError.badGateway(message);
    }
    if (env.LOG_AI_CALLS) console.info(`[openai] ${url} ok`);
    return payload;
  }
}

function parseClassifications(content: string, expected: number): CommentClassification[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw ApiError.badGateway('OpenAI classification response was not valid JSON');
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
    const confidence = clamp01(Number(item.confidence));
    byIndex.set(index, { index, intent, confidence: Number.isFinite(confidence) ? confidence : 0.5 });
  }

  // Guarantee one classification per input.
  return Array.from({ length: expected }, (_, index) =>
    byIndex.get(index) ?? { index, intent: 'OTHER' as CommentIntent, confidence: 0.3 },
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

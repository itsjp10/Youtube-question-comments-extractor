import type { AIProvider } from './ai-provider.interface';
import { HeuristicProvider } from './heuristic.provider';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { env } from '../config/env';

export type { AIProvider } from './ai-provider.interface';

let cached: AIProvider | null = null;

/**
 * Provider factory. The rest of the app depends only on the `AIProvider`
 * interface; this is the single place that knows the concrete classes.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  switch (env.AI_PROVIDER) {
    case 'openai':
      cached = new OpenAIProvider({
        apiKey: env.AI_API_KEY,
        chatModel: env.AI_MODEL,
      });
      break;
    case 'gemini':
      cached = new GeminiProvider({
        apiKey: env.AI_API_KEY,
        chatModel: env.AI_MODEL,
      });
      break;
    case 'heuristic':
    default:
      cached = new HeuristicProvider();
      break;
  }

  return cached;
}

/** Test / hot-reload helper. */
export function resetAIProvider(): void {
  cached = null;
}

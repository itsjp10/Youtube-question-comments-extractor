import 'dotenv/config';
import { z } from 'zod';

/**
 * Central, validated configuration. Import `env` anywhere instead of touching
 * `process.env` directly so misconfiguration fails fast on boot.
 */
const booleanish = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  YOUTUBE_API_KEY: z.string().default(''),

  AI_PROVIDER: z.enum(['heuristic', 'openai', 'gemini']).default('heuristic'),
  AI_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default(''),

  MAX_COMMENTS_PER_ANALYSIS: z.coerce.number().int().positive().default(1000),
  AI_CLASSIFY_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  AI_EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(100),

  CLUSTER_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.82),
  CLUSTER_MIN_POINTS: z.coerce.number().int().positive().default(2),

  DUPLICATE_ANALYSIS_WINDOW_HOURS: z.coerce.number().min(0).default(24),

  LOG_AI_CALLS: booleanish.default('false'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  /** True when CLUSTER_SIMILARITY_THRESHOLD was set explicitly (overrides the AI provider default). */
  CLUSTER_SIMILARITY_THRESHOLD_SET: process.env.CLUSTER_SIMILARITY_THRESHOLD !== undefined,
};
export type Env = typeof env;

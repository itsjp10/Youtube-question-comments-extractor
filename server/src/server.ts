import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { getAIProvider } from './providers';

async function main(): Promise<void> {
  // Fail fast if the DB is unreachable.
  await prisma.$connect();

  const provider = getAIProvider();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        `  YouTube Comment Analyzer API`,
        `  ─────────────────────────────`,
        `  URL          http://localhost:${env.PORT}`,
        `  Env          ${env.NODE_ENV}`,
        `  AI provider  ${provider.name}${env.AI_MODEL ? ` (${env.AI_MODEL})` : ''}`,
        `  YouTube key  ${env.YOUTUBE_API_KEY ? 'configured' : 'MISSING — analyses will fail'}`,
        `  Frontend     ${env.FRONTEND_URL}`,
        '',
      ].join('\n'),
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});

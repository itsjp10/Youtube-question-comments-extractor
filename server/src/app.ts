import express, { type Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';

export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.json({ success: true, data: { name: 'youtube-comment-analyzer-api', version: '1.0.0' } });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

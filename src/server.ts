import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { connectDB } from './config/db';
import { router } from './routes';

async function start() {
  try {
    await connectDB();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[decision-engine] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const app = express();

  // Request logging: helps debug when endpoints are hit but handlers hang/fail.
  app.use((req, res, next) => {
    const start = Date.now();
    const id = Math.random().toString(16).slice(2);
    // eslint-disable-next-line no-console
    console.log(
      `[decision-engine] ${id} -> ${req.method} ${req.path}`
    );

    res.on('finish', () => {
      const ms = Date.now() - start;
      // eslint-disable-next-line no-console
      console.log(
        `[decision-engine] ${id} <- ${req.method} ${req.path} ${res.statusCode} (${ms}ms)`
      );
    });

    next();
  });

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/', router);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const message = err?.message || 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[decision-engine] Unhandled error:', message, err);
    res.status(500).json({ error: message });
  });

  const host = process.env.HOST || '0.0.0.0';
  app.listen(config.port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`[decision-engine] Listening on ${host}:${config.port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[decision-engine] Fatal error starting server:', err);
  process.exit(1);
});


import express from 'express';
import rateLimit from 'express-rate-limit';
import { MSG } from './messages.js';
import {
  getAllowedOrigins,
  parseAllowedOrigins,
  setAllowedOrigins,
} from './originGuard.js';
import documentsRouter from './routes/documents.js';

export function createApp(options = {}) {
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN?.trim() ?? '';
  const shareAllowedOrigins = parseAllowedOrigins(
    options.shareAllowedOrigins ?? process.env.SHARE_ALLOWED_ORIGINS ?? '',
  );
  setAllowedOrigins(shareAllowedOrigins);

  const app = express();
  app.set('trust proxy', 1);

  if (corsOrigin) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin === corsOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    });
  }

  app.use(express.json({ limit: '1.1mb' }));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMIT',
      message: MSG.RATE_LIMIT,
    },
  });

  app.use('/api', apiLimiter, documentsRouter);

  app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        error: 'INVALID_JSON',
        message: MSG.INVALID_JSON,
      });
    }
    next(err);
  });

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'CONTENT_TOO_LARGE',
        message: MSG.CONTENT_TOO_LARGE,
      });
    }
    console.error(err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: MSG.INTERNAL_ERROR,
    });
  });

  return app;
}

export { getAllowedOrigins };

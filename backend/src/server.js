import express from 'express';
import rateLimit from 'express-rate-limit';
import { initDb } from './db.js';
import { MSG } from './messages.js';
import documentsRouter from './routes/documents.js';

const PORT = Number(process.env.PORT) || 41738;
const DATABASE_PATH =
  process.env.DATABASE_PATH ||
  (process.env.NODE_ENV === 'production' ? '/app/data/snow.db' : './data/snow.db');
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim() || '';

initDb(DATABASE_PATH);

const app = express();

app.set('trust proxy', 1);

if (CORS_ORIGIN) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === CORS_ORIGIN) {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Snow Editor API listening on http://0.0.0.0:${PORT}`);
  console.log(`Database: ${DATABASE_PATH}`);
});

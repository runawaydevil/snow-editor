import { getDb, initDb, purgeExpiredDocuments } from './db.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 41738;
const DATABASE_PATH =
  process.env.DATABASE_PATH ||
  (process.env.NODE_ENV === 'production' ? '/app/data/snow.db' : './data/snow.db');

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

initDb(DATABASE_PATH);

function sweepExpiredDocuments() {
  try {
    const removed = purgeExpiredDocuments(getDb());
    if (removed > 0) {
      console.log(`[purge] removed ${removed} expired document(s)`);
    }
  } catch (err) {
    console.error('[purge] failed to remove expired documents', err);
  }
}

sweepExpiredDocuments();
setInterval(sweepExpiredDocuments, PURGE_INTERVAL_MS).unref();

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Snow Editor API listening on http://0.0.0.0:${PORT}`);
  console.log(`Database: ${DATABASE_PATH}`);
});

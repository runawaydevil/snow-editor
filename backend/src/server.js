import { initDb } from './db.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 41738;
const DATABASE_PATH =
  process.env.DATABASE_PATH ||
  (process.env.NODE_ENV === 'production' ? '/app/data/snow.db' : './data/snow.db');

initDb(DATABASE_PATH);

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Snow Editor API listening on http://0.0.0.0:${PORT}`);
  console.log(`Database: ${DATABASE_PATH}`);
});

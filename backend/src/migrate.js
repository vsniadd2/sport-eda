import { initDb } from './db.js';

initDb()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Ошибка миграций:', err);
    process.exit(1);
  });

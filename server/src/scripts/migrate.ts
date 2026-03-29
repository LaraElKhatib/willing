import database from '../db/index.ts';
import { migrateToLatest } from '../db/migrate.ts';

try {
  await migrateToLatest(database);
} finally {
  await database.destroy();
}

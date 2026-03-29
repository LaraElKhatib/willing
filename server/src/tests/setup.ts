import { sql } from 'kysely';
import supertest from 'supertest';
import { beforeAll, beforeEach } from 'vitest';

import app from '../app.ts';
import { truncateAllTables } from './helpers/database.ts';

import type TestAgent from 'supertest/lib/agent.js';

export let server: TestAgent;

beforeAll(async () => {
  const [{ default: config }, { default: database }, { migrateToLatest }] = await Promise.all([
    import('../config.ts'),
    import('../db/index.ts'),
    import('../db/migrate.ts'),
  ]);

  await database.schema.createSchema(config.POSTGRES_SCHEMA).ifNotExists().execute();
  await sql`SET search_path TO ${sql.raw(config.POSTGRES_SCHEMA)}, public`.execute(database);

  await migrateToLatest(database);
  await truncateAllTables();

  server = supertest(app);
});

beforeEach(async () => {
  await truncateAllTables();
});

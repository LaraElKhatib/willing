import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import createApp from './app.ts';
import database from './db/index.ts';

import type { Database } from './db/tables/index.ts';
import type { ControlledTransaction } from 'kysely';
import type TestAgent from 'supertest/lib/agent.js';

let db: ControlledTransaction<Database, []>;
let server: TestAgent;

beforeEach(async () => {
  db = await database.startTransaction().execute();
  server = supertest(createApp(db));
});

afterEach(async () => {
  await db.rollback().execute();
});

describe('GET unknown route', () => {
  test('returns structured 404 for unknown routes', async () => {
    const response = await server
      .get('/not-a-real-route')
      .expect(404);

    expect(response.body).toMatchObject({
      message: 'Not Found - /not-a-real-route',
    });
  });
});

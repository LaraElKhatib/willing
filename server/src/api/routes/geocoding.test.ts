import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import createApp from '../../app.ts';
import database from '../../db/index.ts';
import queryLocationIQ from '../../services/locationiq/index.ts';

import type { Database } from '../../db/tables/index.ts';
import type { ControlledTransaction } from 'kysely';
import type TestAgent from 'supertest/lib/agent.js';

let transaction: ControlledTransaction<Database, []>;
let server: TestAgent;

vi.mock(import('../../services/locationiq/index.ts'), () => ({
  default: vi.fn(async () => []),
}));

beforeEach(async () => {
  transaction = await database.startTransaction().execute();
  server = supertest(createApp(transaction));
});

afterEach(async () => {
  await transaction.rollback().execute();
  vi.mocked(queryLocationIQ).mockClear();
});

describe('GET /geocoding/search', () => {
  test('returns 400 if not provided a search term', async () => {
    await server
      .get('/geocoding/search')
      .expect(400);
  });

  test('returns 400 if not provided a search term which is too short', async () => {
    await server
      .get('/geocoding/search')
      .query({ query: '   a' })
      .expect(400);
  });

  test('returns a list of geocoding entries if provided with a valid search term', async () => {
    const response = await server
      .get('/geocoding/search')
      .query({ query: 'aub' })
      .expect(200);

    expect(queryLocationIQ).toHaveBeenCalledWith('aub');
    expect(response.body).toEqual([]);
  });

  test('trims the search query', async () => {
    await server
      .get('/geocoding/search')
      .query({ query: '  aub   ' })
      .expect(200);

    expect(queryLocationIQ).toHaveBeenCalledWith('aub');
  });

  test('returns 400 when query is not a string', async () => {
    await server
      .get('/geocoding/search')
      .query({ query: ['aub', 'airport'] })
      .expect(400);
  });

  test('returns 500 when geocoding provider fails', async () => {
    vi.mocked(queryLocationIQ).mockRejectedValueOnce(new Error('LocationIQ unavailable'));

    await server
      .get('/geocoding/search')
      .query({ query: 'aub' })
      .expect(500);
  });
});

import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';

import config from '../config.js';
import { Database } from './tables/index.js';

types.setTypeParser(types.builtins.NUMERIC, Number);

const dialect = new PostgresDialect({
  pool: new Pool({
    database: config.POSTGRES_DB,
    host: config.POSTGRES_HOST,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    port: config.POSTGRES_PORT,
    max: 10,
  }),
});

export default new Kysely<Database>({
  dialect,
});

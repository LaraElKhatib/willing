import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';

import config from '../config.ts';
import { type Database } from './tables/index.ts';

types.setTypeParser(types.builtins.NUMERIC, Number);

const dialect = new PostgresDialect({
  pool: new Pool({
    database: config.POSTGRES_DB,
    host: config.POSTGRES_HOST,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    port: config.POSTGRES_PORT,
    max: 10,
    options: `-c search_path=${config.POSTGRES_SCHEMA},public`,
  }),
});
const database = new Kysely<Database>({
  dialect,
});

export default database;

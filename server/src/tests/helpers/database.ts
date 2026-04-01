import { sql } from 'kysely';

import config from '../../config.ts';
import database from '../../db/index.ts';

const getActiveSchemaName = () => config.POSTGRES_SCHEMA;

export async function resetDatabase() {
  const schemaName = getActiveSchemaName();
  await database.schema.dropSchema(schemaName).ifExists().cascade().execute();
  await database.schema.createSchema(schemaName).execute();
}

export async function truncateAllTables() {
  const schemaName = getActiveSchemaName();
  const escapedSchema = schemaName.replace(/'/g, '\'\'');
  await sql.raw(`
    DO $$
    DECLARE
      truncate_statement text;
    BEGIN
      SELECT
        'TRUNCATE TABLE ' || string_agg(format('%I', tablename), ', ') || ' RESTART IDENTITY CASCADE'
      INTO truncate_statement
      FROM pg_tables
      WHERE schemaname = '${escapedSchema}'
        AND tablename NOT IN ('kysely_migration', 'kysely_migration_lock');

      IF truncate_statement IS NOT NULL THEN
        EXECUTE truncate_statement;
      END IF;
    END $$;
  `).execute(database);
}

import { sql } from 'kysely';

export async function setup() {
  const { default: database } = await import('../db/index.ts');
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`.execute(database);
}

export async function teardown() {
  const { default: database } = await import('../db/index.ts');
  await database.destroy();
}

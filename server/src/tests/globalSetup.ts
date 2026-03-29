import { truncateAllTables } from './helpers/database.ts';

export async function setup() {
  truncateAllTables();
}

export async function teardown() {
  const { default: database } = await import('../db/index.ts');
  await database.destroy();
}

import { type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Rename table organization_posting to posting
  await db.schema.alterTable('organization_posting').renameTo('posting').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Rename table back from posting to organization_posting
  await db.schema.alterTable('posting').renameTo('organization_posting').execute();
}

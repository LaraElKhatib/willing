import { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_account')
    .addColumn('is_disabled', 'boolean')
    .addColumn('is_deleted', 'boolean')
    .execute();

  await db.schema
    .alterTable('volunteer_account')
    .addColumn('is_disabled', 'boolean')
    .addColumn('is_deleted', 'boolean')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('volunteer_account')
    .dropColumn('is_deleted')
    .dropColumn('is_disabled')
    .execute();

  await db.schema
    .alterTable('organization_account')
    .dropColumn('is_deleted')
    .dropColumn('is_disabled')
    .execute();
}

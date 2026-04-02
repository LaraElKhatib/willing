import { type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('admin_account')
    .addColumn('token_version', 'integer', col => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .alterTable('organization_account')
    .addColumn('token_version', 'integer', col => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .alterTable('volunteer_account')
    .addColumn('token_version', 'integer', col => col.notNull().defaultTo(0))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('volunteer_account')
    .dropColumn('token_version')
    .execute();

  await db.schema
    .alterTable('organization_account')
    .dropColumn('token_version')
    .execute();

  await db.schema
    .alterTable('admin_account')
    .dropColumn('token_version')
    .execute();
}

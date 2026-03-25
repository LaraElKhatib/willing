import { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_posting')
    .addColumn('allows_partial_attendance', 'boolean')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_posting')
    .dropColumn('allows_partial_attendance')
    .execute();
}

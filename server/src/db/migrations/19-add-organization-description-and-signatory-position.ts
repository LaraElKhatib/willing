import { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_certificate_info')
    .addColumn('signatory_position', 'varchar(128)')
    .addColumn('certificate_feature_enabled', 'boolean', col => col.defaultTo(false).notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_certificate_info')
    .dropColumn('certificate_feature_enabled')
    .dropColumn('signatory_position')
    .execute();
}

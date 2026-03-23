import { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('platform_certificate_settings')
    .addColumn('signature_uploaded_by_admin_id', 'integer', col =>
      col.references('admin_account.id').onDelete('set null'),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('platform_certificate_settings')
    .dropColumn('signature_uploaded_by_admin_id')
    .execute();
}

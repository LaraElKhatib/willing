import { type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('enrollment_application_date')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('application_id', 'integer', col =>
      col.notNull().references('enrollment_application.id'),
    )
    .addColumn('date', 'date', col => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropTable('enrollment_application_date')
    .execute();
}

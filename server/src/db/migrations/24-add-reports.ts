import { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('organization_report')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('reported_organization_id', 'integer', col =>
      col.notNull().references('organization_account.id'),
    )
    .addColumn('reporter_volunteer_id', 'integer', col =>
      col.notNull().references('volunteer_account.id'),
    )
    .addColumn('title', 'varchar(128)', col => col.notNull())
    .addColumn('message', 'text', col => col.notNull())
    .addColumn('created_at', 'timestamp')
    .execute();

  await db.schema
    .createTable('volunteer_report')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('reported_volunteer_id', 'integer', col =>
      col.notNull().references('volunteer_account.id'),
    )
    .addColumn('reporter_organization_id', 'integer', col =>
      col.notNull().references('organization_account.id'),
    )
    .addColumn('title', 'varchar(128)', col => col.notNull())
    .addColumn('message', 'text', col => col.notNull())
    .addColumn('created_at', 'timestamp')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropTable('volunteer_report')
    .execute();

  await db.schema
    .dropTable('organization_report')
    .execute();
}

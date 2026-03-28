import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('volunteer_pending_account')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('first_name', 'varchar(64)', col => col.notNull())
    .addColumn('last_name', 'varchar(64)', col => col.notNull())
    .addColumn('password', 'varchar(256)', col => col.notNull())
    .addColumn('email', 'varchar(128)', col => col.notNull().unique())
    .addColumn('gender', 'varchar(64)', col => col.notNull())
    .addColumn('date_of_birth', 'date', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('token', 'varchar', col => col.notNull().unique())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropTable('volunteer_pending_account')
    .execute();
}

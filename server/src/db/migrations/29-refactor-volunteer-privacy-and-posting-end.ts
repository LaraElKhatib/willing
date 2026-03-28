import { type Kysely, sql } from 'kysely';

import type { Database } from '../tables/index.ts';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('volunteer_account')
    .dropColumn('privacy')
    .execute();

  await db
    .updateTable('organization_posting')
    .set({
      end_date: sql`COALESCE(end_date, start_date)`,
      end_time: sql`COALESCE(end_time, start_time)`,
    })
    .execute();

  await db.schema
    .alterTable('organization_posting')
    .alterColumn('end_date', col => col.setNotNull())
    .alterColumn('end_time', col => col.setNotNull())
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('organization_posting')
    .alterColumn('end_date', col => col.dropNotNull())
    .alterColumn('end_time', col => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable('volunteer_account')
    .addColumn('privacy', 'varchar(32)', col => col.notNull().defaultTo('public'))
    .execute();
}

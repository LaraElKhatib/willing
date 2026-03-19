import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_posting')
    .addColumn('start_date', 'date', col => col.generatedAlwaysAs(sql`start_timestamp::date`).stored())
    .addColumn('start_time', 'time', col => col.generatedAlwaysAs(sql`start_timestamp::time`).stored())
    .addColumn('end_date', 'date', col => col.generatedAlwaysAs(sql`end_timestamp::date`).stored())
    .addColumn('end_time', 'time', col => col.generatedAlwaysAs(sql`end_timestamp::time`).stored())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('organization_posting')
    .dropColumn('end_time')
    .dropColumn('end_date')
    .dropColumn('start_time')
    .dropColumn('start_date')
    .execute();
}

import { Kysely, sql } from 'kysely';

import {
  addUpdatedAtTrigger,
  dropUpdatedAtTrigger,
  ensureSetUpdatedAtFunction,
} from '../migration-utils.js';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('platform_certificate_settings')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('signatory_name', 'varchar(128)')
    .addColumn('signatory_position', 'varchar(128)')
    .addColumn('signature_path', 'varchar(256)')
    .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', col => col.notNull().defaultTo(sql`now()`))
    .execute();

  await ensureSetUpdatedAtFunction(db);
  await addUpdatedAtTrigger(db, 'platform_certificate_settings');
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await dropUpdatedAtTrigger(db, 'platform_certificate_settings');

  await db.schema
    .dropTable('platform_certificate_settings')
    .execute();
}

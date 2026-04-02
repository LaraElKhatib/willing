import { promises as fs } from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import {
  Migrator,
  type MigrationProvider,
  type Migration,
  type Kysely,
} from 'kysely';

import config from '../config.ts';

import type { Database } from './tables/index.ts';

class ESMFileMigrationProvider implements MigrationProvider {
  private readonly migrationFolder: string;

  constructor(migrationFolder: string) {
    this.migrationFolder = migrationFolder;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    const files = await fs.readdir(this.migrationFolder);

    const migrations: Record<string, Migration> = {};

    for (const file of files) {
      if (
        (!file.endsWith('.js') && !file.endsWith('.ts'))
        || file.endsWith('.d.ts')
      ) {
        continue;
      }

      const fullPath = path.join(this.migrationFolder, file);
      const mod = await import(pathToFileURL(fullPath).href);

      const name = file.replace(/\.(js|ts)$/, '');
      migrations[name] = { up: mod.up, down: mod.down };
    }

    return migrations;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsPath = path.join(__dirname, 'migrations');

export async function migrateToLatest(database: Kysely<Database>) {
  const migrator = new Migrator({
    db: database,
    provider: new ESMFileMigrationProvider(migrationsPath),
    migrationTableSchema: config.POSTGRES_SCHEMA,
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`Migration "${result.migrationName}" was executed successfully`);
    } else if (result.status === 'Error') {
      console.error(`Failed to execute migration "${result.migrationName}"`);
    }
  });

  if (error) {
    console.error('Migration error details:', error);
    throw new Error(`Migration failed: ${String(error)}`);
  }
}

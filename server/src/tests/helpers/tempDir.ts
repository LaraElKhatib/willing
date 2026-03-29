import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export async function createTempDir() {
  const dir = path.join(os.tmpdir(), `test-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function removeTempDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

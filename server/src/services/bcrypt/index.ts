import bcrypt from 'bcrypt';

import config from '../../config.ts';

const SALT_ROUNDS = config.NODE_ENV === 'test' ? 3 : 10;

export async function hash(password: string) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function compare(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

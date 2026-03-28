import bcrypt from 'bcrypt';

import database from '../db/index.ts';

await database.insertInto('admin_account').values({
  first_name: 'John',
  last_name: 'Doe',
  email: 'admin@willing.social',
  password: await bcrypt.hash('changeme', 10),
}).execute();

console.log('Admin account successfully created!');
await database.destroy();

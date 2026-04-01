import database from '../db/index.ts';
import { hash } from '../services/bcrypt/index.ts';

await database.insertInto('admin_account').values({
  first_name: 'John',
  last_name: 'Doe',
  email: 'admin@willing.social',
  password: await hash('changeme'),
}).execute();

console.log('Admin account successfully created!');
await database.destroy();

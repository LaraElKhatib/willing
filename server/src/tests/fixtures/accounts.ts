import bcrypt from 'bcrypt';

import database from '../../db/index.ts';

import type { AdminAccount, OrganizationAccount, VolunteerAccount } from '../../db/tables/index.ts';

type OrganizationFixtureOptions = {
  email?: string;
  password?: string;
  name?: string;
};

type VolunteerFixtureOptions = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

export async function createOrganizationAccount({
  email = 'org@example.com',
  password = 'OrgPassword123!',
  name = 'Helping Hands',
}: OrganizationFixtureOptions = {}): Promise<{
  organization: OrganizationAccount;
  plainPassword: string;
}> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  const organization = await database
    .insertInto('organization_account')
    .values({
      name,
      email,
      phone_number: '+10000000000',
      url: 'https://example.org',
      location_name: 'Beirut',
      password: hashedPassword,
      created_at: now,
      updated_at: now,
      is_disabled: false,
      is_deleted: false,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { organization, plainPassword: password };
}

export async function createVolunteerAccount({
  email = 'vol@example.com',
  password = 'VolPassword123!',
  first_name = 'Jane',
  last_name = 'Doe',
}: VolunteerFixtureOptions = {}): Promise<{
  volunteer: VolunteerAccount;
  plainPassword: string;
}> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  const volunteer = await database
    .insertInto('volunteer_account')
    .values({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      date_of_birth: '2000-01-01',
      gender: 'female',
      created_at: now,
      updated_at: now,
      is_disabled: false,
      is_deleted: false,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { volunteer, plainPassword: password };
}

type AdminFixtureOptions = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

export async function createAdminAccount({
  email = 'admin@example.com',
  password = 'AdminPassword123!',
  first_name = 'Admin',
  last_name = 'User',
}: AdminFixtureOptions = {}): Promise<{
  admin: AdminAccount;
  plainPassword: string;
}> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  const [admin] = await database
    .insertInto('admin_account')
    .values({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .execute();

  return { admin, plainPassword: password };
}

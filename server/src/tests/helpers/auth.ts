import { createAdminAccount, createOrganizationAccount, createVolunteerAccount } from '../fixtures/accounts.ts';
import { server } from '../setup.ts';

export async function loginAdmin(email = 'admin@example.com') {
  const { admin, plainPassword } = await createAdminAccount({ email });
  const response = await server
    .post('/admin/login')
    .send({ email: admin.email, password: plainPassword })
    .expect(200);

  const body = response.body as { token: string };
  return { token: body.token, admin };
}

export async function loginOrganization(email = 'org@example.com') {
  const { organization, plainPassword } = await createOrganizationAccount({ email });
  const response = await server
    .post('/user/login')
    .send({ email: organization.email, password: plainPassword })
    .expect(200);

  const body = response.body as { token: string };
  return { token: body.token, organization };
}

export async function loginVolunteer(email = 'volunteer@example.com') {
  const { volunteer, plainPassword } = await createVolunteerAccount({ email });
  const response = await server
    .post('/user/login')
    .send({ email: volunteer.email, password: plainPassword })
    .expect(200);

  const body = response.body as { token: string };
  return { token: body.token, volunteer };
}

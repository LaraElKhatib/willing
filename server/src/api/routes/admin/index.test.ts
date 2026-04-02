import { type ControlledTransaction } from 'kysely';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import createApp from '../../../app.ts';
import database from '../../../db/index.ts';
import { createAdminAccount, createOrganizationAccount, createVolunteerAccount } from '../../../tests/fixtures/accounts.ts';
import { authHeader } from '../../../tests/helpers/authHeader.ts';

import type { Database } from '../../../db/tables/index.ts';
import type TestAgent from 'supertest/lib/agent.js';

let transaction: ControlledTransaction<Database, []>;
let server: TestAgent;

beforeEach(async () => {
  transaction = await database.startTransaction().execute();
  server = supertest(createApp(transaction));
});

afterEach(async () => {
  await transaction.rollback().execute();
});

describe('GET /admin/reports', () => {
  test('returns 403 when unauthenticated', async () => {
    await server
      .get('/admin/reports')
      .expect(403);
  });

  test('returns 403 when requester is not an admin', async () => {
    const { token } = await createVolunteerAccount();

    await server
      .get('/admin/reports')
      .set(authHeader(token))
      .expect(403);
  });

  test('returns organization and volunteer reports in separate lists for admin', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { organization: reportedOrganization } = await createOrganizationAccount({
      email: 'reported-org@example.com',
      name: 'Reported Organization',
      phone_number: '+10000000001',
      url: 'https://reported-org.example.com',
    });
    const { volunteer: reporterVolunteer } = await createVolunteerAccount({
      email: 'reporter-vol@example.com',
      first_name: 'Reporter',
      last_name: 'Volunteer',
    });

    const { volunteer: reportedVolunteer } = await createVolunteerAccount({
      email: 'reported-vol@example.com',
      first_name: 'Reported',
      last_name: 'Volunteer',
    });
    const { organization: reporterOrganization } = await createOrganizationAccount({
      email: 'reporter-org@example.com',
      name: 'Reporter Organization',
      phone_number: '+10000000002',
      url: 'https://reporter-org.example.com',
    });

    await transaction
      .insertInto('organization_report')
      .values({
        reported_organization_id: reportedOrganization.id,
        reporter_volunteer_id: reporterVolunteer.id,
        title: 'scam',
        message: 'Suspicious behavior',
      })
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto('volunteer_report')
      .values({
        reported_volunteer_id: reportedVolunteer.id,
        reporter_organization_id: reporterOrganization.id,
        title: 'harassment',
        message: 'Inappropriate communication',
      })
      .executeTakeFirstOrThrow();

    const response = await server
      .get('/admin/reports')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.organizationReports).toHaveLength(1);
    expect(response.body.volunteerReports).toHaveLength(1);

    expect(response.body.organizationReports[0]).toMatchObject({
      title: 'scam',
      message: 'Suspicious behavior',
      reported_organization: {
        id: reportedOrganization.id,
        name: 'Reported Organization',
        email: 'reported-org@example.com',
      },
      reporter_volunteer: {
        id: reporterVolunteer.id,
        first_name: 'Reporter',
        last_name: 'Volunteer',
        email: 'reporter-vol@example.com',
      },
    });

    expect(response.body.volunteerReports[0]).toMatchObject({
      title: 'harassment',
      message: 'Inappropriate communication',
      reported_volunteer: {
        id: reportedVolunteer.id,
        first_name: 'Reported',
        last_name: 'Volunteer',
        email: 'reported-vol@example.com',
      },
      reporter_organization: {
        id: reporterOrganization.id,
        name: 'Reporter Organization',
        email: 'reporter-org@example.com',
      },
    });
  });

  test('returns only organization reports when scope=organization', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { organization: reportedOrganization } = await createOrganizationAccount({
      phone_number: '+10000000003',
      url: 'https://scope-org.example.com',
    });
    const { volunteer: reporterVolunteer } = await createVolunteerAccount();

    await transaction
      .insertInto('organization_report')
      .values({
        reported_organization_id: reportedOrganization.id,
        reporter_volunteer_id: reporterVolunteer.id,
        title: 'other',
        message: 'Organization-only report',
      })
      .executeTakeFirstOrThrow();

    const response = await server
      .get('/admin/reports?scope=organization')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.organizationReports).toHaveLength(1);
    expect(response.body.volunteerReports).toEqual([]);
  });

  test('filters reports by reportType across both lists', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { organization: reportedOrganization } = await createOrganizationAccount({
      email: 'org1@example.com',
      phone_number: '+10000000004',
      url: 'https://org1.example.com',
    });
    const { volunteer: reporterVolunteer } = await createVolunteerAccount({ email: 'vol1@example.com' });
    const { volunteer: reportedVolunteer } = await createVolunteerAccount({ email: 'vol2@example.com' });
    const { organization: reporterOrganization } = await createOrganizationAccount({
      email: 'org2@example.com',
      phone_number: '+10000000005',
      url: 'https://org2.example.com',
    });

    await transaction
      .insertInto('organization_report')
      .values({
        reported_organization_id: reportedOrganization.id,
        reporter_volunteer_id: reporterVolunteer.id,
        title: 'scam',
        message: 'Matching type',
      })
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto('volunteer_report')
      .values({
        reported_volunteer_id: reportedVolunteer.id,
        reporter_organization_id: reporterOrganization.id,
        title: 'other',
        message: 'Non-matching type',
      })
      .executeTakeFirstOrThrow();

    const response = await server
      .get('/admin/reports?reportType=scam')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.organizationReports).toHaveLength(1);
    expect(response.body.volunteerReports).toHaveLength(0);
  });

  test('returns 400 when scope query is invalid', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .get('/admin/reports?scope=invalid-scope')
      .set(authHeader(adminToken))
      .expect(400);
  });
});

describe('GET /admin/reports/organization/:reportId', () => {
  test('returns 403 when unauthenticated', async () => {
    await server
      .get('/admin/reports/organization/1')
      .expect(403);
  });

  test('returns 403 when requester is not an admin', async () => {
    const { token } = await createVolunteerAccount();

    await server
      .get('/admin/reports/organization/1')
      .set(authHeader(token))
      .expect(403);
  });

  test('returns the organization report details for admin', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { organization: reportedOrganization } = await createOrganizationAccount({
      email: 'reported-org-details@example.com',
      name: 'Reported Org Details',
      phone_number: '+10000000008',
      url: 'https://reported-org-details.example.com',
    });
    const { volunteer: reporterVolunteer } = await createVolunteerAccount({
      email: 'reporter-vol-details@example.com',
      first_name: 'Reporter',
      last_name: 'Volunteer',
    });

    const report = await transaction
      .insertInto('organization_report')
      .values({
        reported_organization_id: reportedOrganization.id,
        reporter_volunteer_id: reporterVolunteer.id,
        title: 'scam',
        message: 'Organization report details',
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const response = await server
      .get(`/admin/reports/organization/${report.id}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toMatchObject({
      id: report.id,
      title: 'scam',
      message: 'Organization report details',
      reported_organization: {
        id: reportedOrganization.id,
        name: 'Reported Org Details',
        email: 'reported-org-details@example.com',
      },
      reporter_volunteer: {
        id: reporterVolunteer.id,
        first_name: 'Reporter',
        last_name: 'Volunteer',
        email: 'reporter-vol-details@example.com',
      },
    });
  });

  test('returns 404 when organization report does not exist', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .get('/admin/reports/organization/999999')
      .set(authHeader(adminToken))
      .expect(404);
  });
});

describe('GET /admin/reports/volunteer/:reportId', () => {
  test('returns 403 when unauthenticated', async () => {
    await server
      .get('/admin/reports/volunteer/1')
      .expect(403);
  });

  test('returns 403 when requester is not an admin', async () => {
    const { token } = await createOrganizationAccount({
      phone_number: '+10000000009',
      url: 'https://non-admin-org-details.example.com',
    });

    await server
      .get('/admin/reports/volunteer/1')
      .set(authHeader(token))
      .expect(403);
  });

  test('returns the volunteer report details for admin', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { volunteer: reportedVolunteer } = await createVolunteerAccount({
      email: 'reported-vol-details@example.com',
      first_name: 'Reported',
      last_name: 'Volunteer',
    });
    const { organization: reporterOrganization } = await createOrganizationAccount({
      email: 'reporter-org-details@example.com',
      name: 'Reporter Org Details',
      phone_number: '+10000000010',
      url: 'https://reporter-org-details.example.com',
    });

    const report = await transaction
      .insertInto('volunteer_report')
      .values({
        reported_volunteer_id: reportedVolunteer.id,
        reporter_organization_id: reporterOrganization.id,
        title: 'harassment',
        message: 'Volunteer report details',
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const response = await server
      .get(`/admin/reports/volunteer/${report.id}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toMatchObject({
      id: report.id,
      title: 'harassment',
      message: 'Volunteer report details',
      reported_volunteer: {
        id: reportedVolunteer.id,
        first_name: 'Reported',
        last_name: 'Volunteer',
        email: 'reported-vol-details@example.com',
      },
      reporter_organization: {
        id: reporterOrganization.id,
        name: 'Reporter Org Details',
        email: 'reporter-org-details@example.com',
      },
    });
  });

  test('returns 404 when volunteer report does not exist', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .get('/admin/reports/volunteer/999999')
      .set(authHeader(adminToken))
      .expect(404);
  });
});

describe('POST /admin/reports/organization/:reportId/reject', () => {
  test('returns 403 when unauthenticated', async () => {
    await server
      .post('/admin/reports/organization/1/reject')
      .expect(403);
  });

  test('returns 404 when organization report does not exist', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .post('/admin/reports/organization/999999/reject')
      .set(authHeader(adminToken))
      .expect(404);
  });

  test('removes organization report when admin rejects it', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { organization: reportedOrganization } = await createOrganizationAccount({
      phone_number: '+10000000011',
      url: 'https://reject-org.example.com',
    });
    const { volunteer: reporterVolunteer } = await createVolunteerAccount();

    const report = await transaction
      .insertInto('organization_report')
      .values({
        reported_organization_id: reportedOrganization.id,
        reporter_volunteer_id: reporterVolunteer.id,
        title: 'other',
        message: 'To be rejected',
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await server
      .post(`/admin/reports/organization/${report.id}/reject`)
      .set(authHeader(adminToken))
      .expect(200);

    const deletedReport = await transaction
      .selectFrom('organization_report')
      .select(['id'])
      .where('id', '=', report.id)
      .executeTakeFirst();

    expect(deletedReport).toBeUndefined();
  });
});

describe('POST /admin/reports/volunteer/:reportId/reject', () => {
  test('returns 403 when requester is not an admin', async () => {
    const { token } = await createVolunteerAccount();

    await server
      .post('/admin/reports/volunteer/1/reject')
      .set(authHeader(token))
      .expect(403);
  });

  test('returns 404 when volunteer report does not exist', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .post('/admin/reports/volunteer/999999/reject')
      .set(authHeader(adminToken))
      .expect(404);
  });

  test('removes volunteer report when admin rejects it', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { volunteer: reportedVolunteer } = await createVolunteerAccount();
    const { organization: reporterOrganization } = await createOrganizationAccount({
      phone_number: '+10000000012',
      url: 'https://reject-vol.example.com',
    });

    const report = await transaction
      .insertInto('volunteer_report')
      .values({
        reported_volunteer_id: reportedVolunteer.id,
        reporter_organization_id: reporterOrganization.id,
        title: 'harassment',
        message: 'Volunteer report to reject',
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await server
      .post(`/admin/reports/volunteer/${report.id}/reject`)
      .set(authHeader(adminToken))
      .expect(200);

    const deletedReport = await transaction
      .selectFrom('volunteer_report')
      .select(['id'])
      .where('id', '=', report.id)
      .executeTakeFirst();

    expect(deletedReport).toBeUndefined();
  });
});

describe('POST /admin/reports/organization/:organizationId/disable', () => {
  test('returns 403 when unauthenticated', async () => {
    await server
      .post('/admin/reports/organization/1/disable')
      .expect(403);
  });

  test('returns 404 when organization account does not exist', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .post('/admin/reports/organization/999999/disable')
      .set(authHeader(adminToken))
      .expect(404);
  });

  test('sets organization account as disabled and increments token version', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { organization } = await createOrganizationAccount({
      phone_number: '+10000000006',
      url: 'https://disable-org.example.com',
    });

    const before = await transaction
      .selectFrom('organization_account')
      .select(['is_disabled', 'token_version'])
      .where('id', '=', organization.id)
      .executeTakeFirstOrThrow();

    expect(before.is_disabled).toBe(false);

    await server
      .post(`/admin/reports/organization/${organization.id}/disable`)
      .set(authHeader(adminToken))
      .expect(200);

    const after = await transaction
      .selectFrom('organization_account')
      .select(['is_disabled', 'token_version'])
      .where('id', '=', organization.id)
      .executeTakeFirstOrThrow();

    expect(after.is_disabled).toBe(true);
    expect(after.token_version).toBe(before.token_version + 1);
  });
});

describe('POST /admin/reports/volunteer/:volunteerId/disable', () => {
  test('returns 403 when requester is not an admin', async () => {
    const { token } = await createOrganizationAccount({
      phone_number: '+10000000007',
      url: 'https://non-admin-org.example.com',
    });

    await server
      .post('/admin/reports/volunteer/1/disable')
      .set(authHeader(token))
      .expect(403);
  });

  test('returns 404 when volunteer account does not exist', async () => {
    const { token: adminToken } = await createAdminAccount();

    await server
      .post('/admin/reports/volunteer/999999/disable')
      .set(authHeader(adminToken))
      .expect(404);
  });

  test('sets volunteer account as disabled and increments token version', async () => {
    const { token: adminToken } = await createAdminAccount();
    const { volunteer } = await createVolunteerAccount();

    const before = await transaction
      .selectFrom('volunteer_account')
      .select(['is_disabled', 'token_version'])
      .where('id', '=', volunteer.id)
      .executeTakeFirstOrThrow();

    expect(before.is_disabled).toBe(false);

    await server
      .post(`/admin/reports/volunteer/${volunteer.id}/disable`)
      .set(authHeader(adminToken))
      .expect(200);

    const after = await transaction
      .selectFrom('volunteer_account')
      .select(['is_disabled', 'token_version'])
      .where('id', '=', volunteer.id)
      .executeTakeFirstOrThrow();

    expect(after.is_disabled).toBe(true);
    expect(after.token_version).toBe(before.token_version + 1);
  });
});

import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import createApp from '../../../app.ts';
import database from '../../../db/index.ts';
import * as embeddingUpdates from '../../../services/embeddings/updates.ts';
import * as jwtService from '../../../services/jwt/index.ts';
import * as volunteerService from '../../../services/volunteer/index.ts';
import { createAdminAccount, createOrganizationAccount, createVolunteerAccount } from '../../../tests/fixtures/accounts.ts';
import { createOrganizationRequest } from '../../../tests/fixtures/organizationData.ts';

import type { Database } from '../../../db/tables/index.ts';
import type { VolunteerProfileData } from '../../../services/volunteer/index.ts';
import type { ControlledTransaction, TransactionBuilder } from 'kysely';
import type TestAgent from 'supertest/lib/agent.js';

let transaction: ControlledTransaction<Database, []>;
let server: TestAgent;

const generateJWTSpy = vi
  .spyOn(jwtService, 'generateJWT');

beforeEach(async () => {
  transaction = await database.startTransaction().execute();
  server = supertest(createApp(transaction));
});

afterEach(async () => {
  await transaction.rollback().execute();
});

describe('GET /', () => {
  test('returns 409 if email is used by another volunteer', async () => {
    const { volunteer } = await createVolunteerAccount();

    await server
      .post('/volunteer/create')
      .send({
        password: 'TestPassword123!',
        email: volunteer.email,
        gender: 'male',
        first_name: 'test',
        last_name: 'test',
        date_of_birth: new Date(),
      })
      .expect(409);

    const volunteersNumber = await transaction
      .selectFrom('volunteer_account')
      .select(({ fn }) => fn.count('id').as('volunteer_count'))
      .executeTakeFirst();

    expect(volunteersNumber?.volunteer_count).toBe('1');
  });

  test('returns 409 if email is used in organization request', async () => {
    const request = await createOrganizationRequest();

    await server
      .post('/volunteer/create')
      .send({
        password: 'TestPassword123!',
        email: request.email,
        gender: 'male',
        first_name: 'test',
        last_name: 'test',
        date_of_birth: new Date(),
      })
      .expect(409);

    const [{ volunteer_count }, { organization_request_count }] = await Promise.all([
      transaction
        .selectFrom('volunteer_account')
        .select(({ fn }) => fn.count('id').as('volunteer_count'))
        .executeTakeFirstOrThrow(),
      transaction
        .selectFrom('organization_request')
        .select(({ fn }) => fn.count('id').as('organization_request_count'))
        .executeTakeFirstOrThrow(),
    ]);

    expect(volunteer_count).toBe('0');
    expect(organization_request_count).toBe('1');
  });

  test('returns 409 if email is used by an organization', async () => {
    const { organization } = await createOrganizationAccount();

    await server
      .post('/volunteer/create')
      .send({
        password: 'TestPassword123!',
        email: organization.email,
        gender: 'male',
        first_name: 'test',
        last_name: 'test',
        date_of_birth: new Date(),
      })
      .expect(409);

    const [{ volunteer_count }, { organization_count }] = await Promise.all([
      transaction
        .selectFrom('volunteer_account')
        .select(({ fn }) => fn.count('id').as('volunteer_count'))
        .executeTakeFirstOrThrow(),
      transaction
        .selectFrom('organization_account')
        .select(({ fn }) => fn.count('id').as('organization_count'))
        .executeTakeFirstOrThrow(),
    ]);

    expect(volunteer_count).toBe('0');
    expect(organization_count).toBe('1');
  });

  test('returns 201 and creates a volunteer', async () => {
    const response = await server
      .post('/volunteer/create')
      .send({
        password: 'TestPassword123!',
        email: 'volunteer@willing.social',
        gender: 'male',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: new Date(),
      })
      .expect(201);

    expect(response.body.volunteer.email).toBe('volunteer@willing.social');
    expect(response.body.volunteer.password).toBeUndefined();
    expect(response.body.volunteer.profile_vector).toBeUndefined();
    expect(response.body.volunteer.experience_vector).toBeUndefined();
    expect(typeof response.body.token).toBe('string');

    expect(generateJWTSpy).toHaveBeenCalledWith({
      id: response.body.volunteer.id,
      role: 'volunteer',
    });

    const { volunteer_count } = await transaction
      .selectFrom('volunteer_account')
      .select(({ fn }) => fn.count('id').as('volunteer_count'))
      .executeTakeFirstOrThrow();

    expect(volunteer_count).toBe('1');
  });
});

describe('GET /volunteer/me', () => {
  test('returns 403 if not logged in as volunteer', async () => {
    await server
      .get('/volunteer/me')
      .expect(403);

    const { token: orgToken } = await createOrganizationAccount();

    await server
      .get('/volunteer/me')
      .set('Authorization', 'Bearer ' + orgToken)
      .expect(403);

    const { token: adminToken } = await createAdminAccount();

    await server
      .get('/volunteer/me')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(403);
  });

  test('returns 200 with the currently logged in volunteer', async () => {
    const { volunteer, token } = await createVolunteerAccount();

    const response = await server
      .get('/volunteer/me')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(response.body).toMatchObject({
      volunteer: {
        email: volunteer.email,
      },
    });
  });
});

describe('GET /volunteer/profile', () => {
  test('returns 403 if not logged in as volunteer', async () => {
    await server
      .get('/volunteer/profile')
      .expect(403);

    const { token: orgToken } = await createOrganizationAccount();

    await server
      .get('/volunteer/profile')
      .set('Authorization', 'Bearer ' + orgToken)
      .expect(403);

    const { token: adminToken } = await createAdminAccount();

    await server
      .get('/volunteer/profile')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(403);
  });

  test('returns profile data for the current volunteer', async () => {
    const { volunteer, token } = await createVolunteerAccount();

    const profileData: VolunteerProfileData = {
      volunteer: {
        id: volunteer.id,
        first_name: volunteer.first_name,
        last_name: volunteer.last_name,
        email: volunteer.email,
        date_of_birth: volunteer.date_of_birth,
        gender: volunteer.gender,
        cv_path: 'uploads/cv.pdf',
        description: 'Ready to lend a hand',
      },
      skills: ['First Aid', 'CPR'],
      experience_stats: {
        total_completed_experiences: 2,
        organizations_supported: 2,
        crisis_related_experiences: 1,
        total_hours_completed: 12,
        total_skills_used: 4,
        most_volunteered_crisis: 'Winter Storm',
      },
      completed_experiences: [
        {
          enrollment_id: 101,
          posting_id: 202,
          posting_title: 'Food Drive',
          organization_id: 303,
          organization_name: 'Helping Hands',
          location_name: 'Community Center',
          start_date: new Date('2025-01-15T00:00:00.000Z'),
          start_time: '08:00:00',
          end_date: new Date('2025-01-15T00:00:00.000Z'),
          end_time: '12:00:00',
          crisis_name: null,
        },
      ],
    };

    const getVolunteerProfileSpy = vi
      .spyOn(volunteerService, 'getVolunteerProfile')
      .mockResolvedValue(profileData);

    try {
      const response = await server
        .get('/volunteer/profile')
        .set('Authorization', 'Bearer ' + token)
        .expect(200);

      expect(getVolunteerProfileSpy).toHaveBeenCalledWith(volunteer.id);
      expect(response.body).toEqual(JSON.parse(JSON.stringify(profileData)));
    } finally {
      getVolunteerProfileSpy.mockRestore();
    }
  });
});

describe('GET /volunteer/certificate', () => {
  test('returns total hours, organization eligibility, and platform certificate info', async () => {
    const { volunteer, token } = await createVolunteerAccount({ email: 'certificate-volunteer@example.com' });
    const { organization } = await createOrganizationAccount({ email: 'certificate-org@example.com' });

    const certificateInfo = await transaction
      .insertInto('organization_certificate_info')
      .values({
        certificate_feature_enabled: true,
        hours_threshold: 3,
        signatory_name: 'Org Signatory',
        signatory_position: 'Director',
        signature_path: 'uploads/org-signature.png',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await transaction
      .updateTable('organization_account')
      .set({ certificate_info_id: certificateInfo.id })
      .where('id', '=', organization.id)
      .execute();

    const posting = await transaction
      .insertInto('organization_posting')
      .values({
        organization_id: organization.id,
        title: 'Relief Packing',
        description: 'Prepare family food boxes',
        latitude: 33.9,
        longitude: 35.5,
        max_volunteers: 25,
        start_date: new Date('2026-02-01T00:00:00.000Z'),
        start_time: '09:00:00',
        end_date: new Date('2026-02-01T00:00:00.000Z'),
        end_time: '13:00:00',
        minimum_age: 18,
        automatic_acceptance: true,
        is_closed: false,
        allows_partial_attendance: false,
        location_name: 'Beirut',
        crisis_id: null,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto('enrollment')
      .values({
        volunteer_id: volunteer.id,
        posting_id: posting.id,
        attended: true,
        created_at: new Date('2026-02-02T00:00:00.000Z'),
      })
      .execute();

    await transaction
      .insertInto('platform_certificate_settings')
      .values({
        signatory_name: 'Old Signatory',
        signatory_position: 'Legacy Lead',
        signature_path: 'uploads/old-platform.png',
        signature_uploaded_by_admin_id: null,
        created_at: new Date('2026-01-04T00:00:00.000Z'),
        updated_at: new Date('2026-01-04T00:00:00.000Z'),
      })
      .execute();

    const latestPlatform = await transaction
      .insertInto('platform_certificate_settings')
      .values({
        signatory_name: 'Platform Lead',
        signatory_position: 'Coordinator',
        signature_path: 'uploads/platform.png',
        signature_uploaded_by_admin_id: null,
        created_at: new Date('2026-01-05T00:00:00.000Z'),
        updated_at: new Date('2026-01-05T00:00:00.000Z'),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const response = await server
      .get('/volunteer/certificate')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(response.body).toMatchObject({
      volunteer: {
        id: volunteer.id,
        first_name: volunteer.first_name,
        last_name: volunteer.last_name,
      },
      total_hours: 4,
      platform_certificate: {
        signatory_name: latestPlatform.signatory_name,
        signatory_position: latestPlatform.signatory_position,
        signature_path: latestPlatform.signature_path,
      },
    });

    expect(response.body.organizations).toHaveLength(1);
    expect(response.body.organizations[0]).toEqual({
      id: organization.id,
      name: organization.name,
      hours: 4,
      hours_threshold: 3,
      certificate_feature_enabled: true,
      eligible: true,
      logo_path: null,
      signatory_name: 'Org Signatory',
      signatory_position: 'Director',
      signature_path: 'uploads/org-signature.png',
    });
  });
});

describe('GET /volunteer/crises/pinned', () => {
  test('returns pinned crises ordered by creation time', async () => {
    const { token } = await createVolunteerAccount({ email: 'crisis-pinned@example.com' });

    const olderPinned = await transaction
      .insertInto('crisis')
      .values({
        name: 'Flood Response',
        description: 'Support flooded regions',
        pinned: true,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const latestPinned = await transaction
      .insertInto('crisis')
      .values({
        name: 'Wildfire Relief',
        description: 'Coordinate evacuations',
        pinned: true,
        created_at: new Date('2024-02-01T00:00:00.000Z'),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto('crisis')
      .values({
        name: 'Unpinned Event',
        description: 'General support',
        pinned: false,
        created_at: new Date('2024-03-01T00:00:00.000Z'),
      })
      .execute();

    const response = await server
      .get('/volunteer/crises/pinned')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(response.body.crises).toHaveLength(2);
    expect(response.body.crises.map((crisis: { id: number }) => crisis.id)).toEqual([
      latestPinned.id,
      olderPinned.id,
    ]);
  });
});

describe('GET /volunteer/crises/:id', () => {
  test('returns 404 for unknown crisis', async () => {
    const { token } = await createVolunteerAccount({ email: 'crisis-lookup@example.com' });

    await server
      .get('/volunteer/crises/999999')
      .set('Authorization', 'Bearer ' + token)
      .expect(404);
  });

  test('returns the requested crisis', async () => {
    const { token } = await createVolunteerAccount({ email: 'crisis-lookup-success@example.com' });

    const crisis = await transaction
      .insertInto('crisis')
      .values({
        name: 'Fuel Shortage',
        description: 'Coordinate deliveries',
        pinned: false,
        created_at: new Date('2025-03-01T00:00:00.000Z'),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const response = await server
      .get(`/volunteer/crises/${crisis.id}`)
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(response.body.crisis).toMatchObject({
      id: crisis.id,
      name: 'Fuel Shortage',
      description: 'Coordinate deliveries',
      pinned: false,
    });
  });
});

describe('PUT /volunteer/profile', () => {
  test('updates volunteer details, replaces skills, and recomputes profile vector', async () => {
    const { volunteer, token } = await createVolunteerAccount({ email: 'profile-update@example.com' });

    await transaction
      .insertInto('volunteer_skill')
      .values({ volunteer_id: volunteer.id, name: 'First Aid' })
      .execute();

    const recomputeProfileSpy = vi
      .spyOn(embeddingUpdates, 'recomputeVolunteerProfileVector')
      .mockResolvedValue(null);

    const profileData: VolunteerProfileData = {
      volunteer: {
        id: volunteer.id,
        first_name: 'Updated',
        last_name: volunteer.last_name,
        email: volunteer.email,
        date_of_birth: volunteer.date_of_birth,
        gender: volunteer.gender,
        cv_path: null,
        description: 'Available evenings',
      },
      skills: ['First Aid', 'Logistics'],
      experience_stats: {
        total_completed_experiences: 0,
        organizations_supported: 0,
        crisis_related_experiences: 0,
        total_hours_completed: 0,
        total_skills_used: 0,
        most_volunteered_crisis: null,
      },
      completed_experiences: [],
    };

    const getVolunteerProfileSpy = vi
      .spyOn(volunteerService, 'getVolunteerProfile')
      .mockResolvedValue(profileData);

    try {
      const response = await server
        .put('/volunteer/profile')
        .set('Authorization', 'Bearer ' + token)
        .send({
          first_name: 'Updated',
          description: 'Available evenings',
          skills: ['Logistics ', 'First Aid', 'Logistics'],
        })
        .expect(200);

      expect(recomputeProfileSpy).toHaveBeenCalledWith(volunteer.id, transaction);
      expect(getVolunteerProfileSpy).toHaveBeenCalledWith(volunteer.id);
      expect(response.body).toEqual(JSON.parse(JSON.stringify(profileData)));

      const updatedVolunteer = await transaction
        .selectFrom('volunteer_account')
        .select(['first_name', 'description'])
        .where('id', '=', volunteer.id)
        .executeTakeFirstOrThrow();

      expect(updatedVolunteer).toMatchObject({
        first_name: 'Updated',
        description: 'Available evenings',
      });

      const updatedSkills = await transaction
        .selectFrom('volunteer_skill')
        .select('name')
        .where('volunteer_id', '=', volunteer.id)
        .orderBy('name', 'asc')
        .execute();

      expect(updatedSkills.map(skill => skill.name)).toEqual(['First Aid', 'Logistics']);
    } finally {
      recomputeProfileSpy.mockRestore();
      getVolunteerProfileSpy.mockRestore();
    }
  });
});

import bcrypt from 'bcrypt';
import { Router, type Response } from 'express';
import * as jose from 'jose';
import { sql } from 'kysely';
import zod from 'zod';

import volunteerCvRouter from './cv.ts';
import {
  type VolunteerCertificateIssueResponse,
  type VolunteerCrisisResponse,
  type VolunteerCrisesResponse,
  type VolunteerCreateResponse,
  type VolunteerCertificateResponse,
  type VolunteerMeResponse,
  type VolunteerOrganizationSearchResponse,
  type VolunteerPinnedCrisesResponse,
  type VolunteerProfileResponse,
} from './index.types.ts';
import volunteerPostingRouter from './posting.ts';
import resetPassword from '../../../auth/resetPassword.ts';
import config from '../../../config.ts';
import database from '../../../db/index.ts';
import { type VolunteerAccountWithoutPassword, newVolunteerAccountSchema, volunteerAccountSchema } from '../../../db/tables/index.ts';
import { CERTIFICATE_PAYLOAD_VERSION, CERTIFICATE_TYPE, signCertificateVerificationPayload } from '../../../services/certificates/token.ts';
import {
  recomputeVolunteerExperienceVector,
  recomputeVolunteerProfileVector,
} from '../../../services/embeddings/updates.ts';
import { getVolunteerProfile } from '../../../services/volunteer/index.ts';
import { authorizeOnly } from '../../authorization.ts';
import { normalizeSearchTerms } from '../utils/postingList.js';

const volunteerRouter = Router();
const volunteerResponseColumns = [
  'id',
  'first_name',
  'last_name',
  'email',
  'date_of_birth',
  'gender',
  'cv_path',
  'description',
] as const;

const volunteerProfileUserUpdateSchema = volunteerAccountSchema.omit({
  id: true,
  first_name: true,
  last_name: true,
  password: true,
  email: true,
  date_of_birth: true,
  profile_vector: true,
  experience_vector: true,
  created_at: true,
  updated_at: true,
}).partial();

const volunteerProfileUpdateSchema = volunteerProfileUserUpdateSchema.extend({
  skills: zod.array(zod.string().trim().min(1, 'Skill cannot be empty')).optional(),
});

const normalizeSkillList = (skills: string[]) =>
  Array.from(new Set(skills.map(skill => skill.trim()).filter(Boolean))).sort();
const volunteerCertificateIssueSchema = zod.object({
  org_ids: zod.array(zod.coerce.number().int().positive()).max(4).default([]),
}).superRefine((data, ctx) => {
  if (new Set(data.org_ids).size !== data.org_ids.length) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      path: ['org_ids'],
      message: 'Organization IDs must be unique.',
    });
  }
});

const areSkillListsEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  return left.every((skill, index) => skill === right[index]);
};

volunteerRouter.post('/create', async (req, res: Response<VolunteerCreateResponse>) => {
  const body = newVolunteerAccountSchema.parse(req.body);

  const existingVolunteer = await database
    .selectFrom('volunteer_account')
    .select('id')
    .where('email', '=', body.email)
    .executeTakeFirst();

  if (existingVolunteer) {
    res.status(409);
    throw new Error('Account already exists, log in or use another email');
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const insertBody = {
    ...body,
    password: hashedPassword,
  };

  const newVolunteer = await database
    .insertInto('volunteer_account')
    .values(insertBody)
    .returning(volunteerResponseColumns)
    .executeTakeFirst();

  if (!newVolunteer) {
    res.status(500);
    throw new Error('Failed to create volunteer');
  }

  await recomputeVolunteerProfileVector(newVolunteer.id);
  await recomputeVolunteerExperienceVector(newVolunteer.id);

  const token = await new jose.SignJWT({ id: newVolunteer.id, role: 'volunteer' })
    .setIssuedAt()
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(config.JWT_SECRET));

  res.json({ volunteer: newVolunteer, token });
});

volunteerRouter.use(authorizeOnly('volunteer'));

volunteerRouter.get('/me', async (req, res: Response<VolunteerMeResponse>) => {
  const volunteer = await database
    .selectFrom('volunteer_account')
    .select(volunteerResponseColumns)
    .where('id', '=', req.userJWT!.id)
    .executeTakeFirstOrThrow();

  res.json({ volunteer });
});

volunteerRouter.get('/profile', async (req, res: Response<VolunteerProfileResponse>) => {
  const profile = await getVolunteerProfile(req.userJWT!.id);
  res.json(profile);
});

volunteerRouter.get('/organizations', async (req, res: Response<VolunteerOrganizationSearchResponse>) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let query = database
    .selectFrom('organization_account')
    .leftJoin('organization_posting', 'organization_posting.organization_id', 'organization_account.id')
    .select([
      'organization_account.id',
      'organization_account.name',
      'organization_account.description',
      'organization_account.location_name',
      'organization_account.logo_path',
      sql<number>`COALESCE(COUNT(organization_posting.id), 0)`.as('posting_count'),
    ])
    .groupBy('organization_account.id');

  if (search) {
    const terms = normalizeSearchTerms(search);
    query = query.where(({ and, or }) => and(
      terms.map((term) => {
        const likePattern = `%${term}%`;
        return or([
          sql<boolean>`lower(organization_account.name) LIKE ${likePattern}`,
          sql<boolean>`regexp_replace(lower(organization_account.name), '[^a-z0-9]+', '', 'g') LIKE ${likePattern}`,
          sql<boolean>`lower(organization_account.description) LIKE ${likePattern}`,
          sql<boolean>`regexp_replace(lower(organization_account.description), '[^a-z0-9]+', '', 'g') LIKE ${likePattern}`,
          sql<boolean>`lower(organization_account.location_name) LIKE ${likePattern}`,
          sql<boolean>`regexp_replace(lower(organization_account.location_name), '[^a-z0-9]+', '', 'g') LIKE ${likePattern}`,
        ]);
      }),
    ));
  }

  const sortBy = typeof req.query.sort_by === 'string' ? req.query.sort_by : 'name';
  const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

  const orderByColumn = sortBy === 'title' ? 'organization_account.name' : 'organization_account.name';

  const organizationsRaw = await query
    .orderBy(orderByColumn, sortDir)
    .limit(30)
    .execute();

  const organizations = organizationsRaw.map(organization => ({
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    location_name: organization.location_name ?? null,
    logo_path: organization.logo_path ?? null,
    posting_count: Number(organization.posting_count ?? 0),
  }));

  res.json({ organizations });
});

volunteerRouter.get('/certificate', async (req, res: Response<VolunteerCertificateResponse>) => {
  const volunteerId = req.userJWT!.id;

  const volunteer = await database
    .selectFrom('volunteer_account')
    .select(['id', 'first_name', 'last_name'])
    .where('id', '=', volunteerId)
    .executeTakeFirstOrThrow();

  const hoursPerPostingExpr = sql<number>`GREATEST(
    0,
    EXTRACT(EPOCH FROM (
      (organization_posting.end_date + organization_posting.end_time)
      - (organization_posting.start_date + organization_posting.start_time)
    )) / 3600.0
  )`;

  const totalHoursRow = await database
    .selectFrom('enrollment')
    .innerJoin('organization_posting', 'organization_posting.id', 'enrollment.posting_id')
    .select(sql<number>`COALESCE(SUM(${hoursPerPostingExpr}), 0)`.as('total_hours'))
    .where('enrollment.volunteer_id', '=', volunteerId)
    .where('enrollment.attended', '=', true)
    .executeTakeFirstOrThrow();

  const organizations = await database
    .selectFrom('enrollment')
    .innerJoin('organization_posting', 'organization_posting.id', 'enrollment.posting_id')
    .innerJoin('organization_account', 'organization_account.id', 'organization_posting.organization_id')
    .leftJoin(
      'organization_certificate_info',
      'organization_certificate_info.id',
      'organization_account.certificate_info_id',
    )
    .select([
      'organization_account.id',
      'organization_account.name',
      'organization_account.logo_path',
      'organization_certificate_info.hours_threshold',
      'organization_certificate_info.certificate_feature_enabled',
      'organization_certificate_info.signatory_name',
      'organization_certificate_info.signatory_position',
      'organization_certificate_info.signature_path',
      sql<number>`SUM(${hoursPerPostingExpr})`.as('hours'),
    ])
    .where('enrollment.volunteer_id', '=', volunteerId)
    .where('enrollment.attended', '=', true)
    .groupBy([
      'organization_account.id',
      'organization_account.name',
      'organization_account.logo_path',
      'organization_certificate_info.hours_threshold',
      'organization_certificate_info.certificate_feature_enabled',
      'organization_certificate_info.signatory_name',
      'organization_certificate_info.signatory_position',
      'organization_certificate_info.signature_path',
    ])
    .orderBy('hours', 'desc')
    .orderBy('organization_account.name', 'asc')
    .execute();

  const platformCertificate = await database
    .selectFrom('platform_certificate_settings')
    .select(['signatory_name', 'signatory_position', 'signature_path'])
    .orderBy('id', 'desc')
    .executeTakeFirst();

  res.json({
    volunteer,
    total_hours: Number(totalHoursRow.total_hours ?? 0),
    organizations: organizations.map((organization) => {
      const hours = Number(organization.hours ?? 0);
      const threshold = organization.hours_threshold ?? null;
      const featureEnabled = Boolean(organization.certificate_feature_enabled);
      const hasSignatoryInfo = Boolean(
        organization.signatory_name?.trim()
        && organization.signatory_position?.trim()
        && organization.signature_path?.trim(),
      );
      const eligible = featureEnabled
        && threshold !== null
        && hasSignatoryInfo
        && hours >= threshold;

      return {
        id: organization.id,
        name: organization.name,
        hours,
        hours_threshold: threshold,
        certificate_feature_enabled: featureEnabled,
        eligible,
        logo_path: organization.logo_path ?? null,
        signatory_name: organization.signatory_name ?? null,
        signatory_position: organization.signatory_position ?? null,
        signature_path: organization.signature_path ?? null,
      };
    }),
    platform_certificate: platformCertificate
      ? {
          signatory_name: platformCertificate.signatory_name ?? null,
          signatory_position: platformCertificate.signatory_position ?? null,
          signature_path: platformCertificate.signature_path ?? null,
        }
      : null,
  });
});

volunteerRouter.post('/certificate/issue', async (req, res: Response<VolunteerCertificateIssueResponse>) => {
  const volunteerId = req.userJWT!.id;
  const body = volunteerCertificateIssueSchema.parse(req.body);
  const issuedAt = new Date();
  const selectedOrgIds = [...body.org_ids].sort((left, right) => left - right);

  const hoursPerPostingExpr = sql<number>`GREATEST(
    0,
    EXTRACT(EPOCH FROM (
      (organization_posting.end_date + organization_posting.end_time)
      - (organization_posting.start_date + organization_posting.start_time)
    )) / 3600.0
  )`;

  const rows = await database
    .selectFrom('enrollment')
    .innerJoin('organization_posting', 'organization_posting.id', 'enrollment.posting_id')
    .select([
      'organization_posting.organization_id as organization_id',
      sql<number>`COALESCE(SUM(${hoursPerPostingExpr}), 0)`.as('hours'),
    ])
    .where('enrollment.volunteer_id', '=', volunteerId)
    .where('enrollment.attended', '=', true)
    .where('enrollment.created_at', '<=', issuedAt)
    .groupBy('organization_posting.organization_id')
    .execute();

  const hoursByOrganizationId = new Map<number, number>();
  rows.forEach((row) => {
    hoursByOrganizationId.set(row.organization_id, Number(Number(row.hours ?? 0).toFixed(2)));
  });

  const totalHours = Number(rows.reduce((sum, row) => sum + Number(row.hours ?? 0), 0).toFixed(2));

  for (const orgId of selectedOrgIds) {
    const orgHours = hoursByOrganizationId.get(orgId);
    if (!orgHours || orgHours <= 0) {
      res.status(400);
      throw new Error(`Organization ${orgId} cannot be included in this certificate.`);
    }
  }

  const hoursPerOrg = selectedOrgIds.reduce<Record<string, number>>((record, orgId) => {
    record[String(orgId)] = Number((hoursByOrganizationId.get(orgId) ?? 0).toFixed(2));
    return record;
  }, {});

  const payload = {
    v: CERTIFICATE_PAYLOAD_VERSION,
    uid: String(volunteerId),
    issued_at: issuedAt.toISOString(),
    org_ids: selectedOrgIds.map(id => String(id)),
    total_hours: totalHours,
    hours_per_org: hoursPerOrg,
    type: CERTIFICATE_TYPE,
  };

  const verificationToken = signCertificateVerificationPayload(payload, config.CERTIFICATE_VERIFICATION_SECRET);

  res.json({
    verification_token: verificationToken,
    issued_at: payload.issued_at,
  });
});

volunteerRouter.get('/crises/pinned', async (_req, res: Response<VolunteerPinnedCrisesResponse>) => {
  const crises = await database
    .selectFrom('crisis')
    .selectAll()
    .where('pinned', '=', true)
    .orderBy('created_at', 'desc')
    .execute();

  res.json({ crises });
});

volunteerRouter.get('/crises', async (req, res: Response<VolunteerCrisesResponse>) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const sortBy = typeof req.query.sort_by === 'string' ? req.query.sort_by : 'title_asc';
  const pinnedFilter = typeof req.query.pinned === 'string'
    ? req.query.pinned === 'true'
      ? true
      : req.query.pinned === 'false'
        ? false
        : undefined
    : undefined;

  let query = database
    .selectFrom('crisis')
    .selectAll();

  if (search) {
    const terms = normalizeSearchTerms(search);
    query = query.where(({ and, or }) => and(
      terms.map((term) => {
        const likePattern = `%${term}%`;
        return or([
          sql<boolean>`lower(crisis.name) LIKE ${likePattern}`,
          sql<boolean>`regexp_replace(lower(crisis.name), '[^a-z0-9]+', '', 'g') LIKE ${likePattern}`,
          sql<boolean>`lower(coalesce(crisis.description, '')) LIKE ${likePattern}`,
          sql<boolean>`regexp_replace(lower(coalesce(crisis.description, '')), '[^a-z0-9]+', '', 'g') LIKE ${likePattern}`,
        ]);
      }),
    ));
  }

  if (typeof pinnedFilter === 'boolean') {
    query = query.where('pinned', '=', pinnedFilter);
  }

  switch (sortBy) {
    case 'title_asc':
      query = query.orderBy('name', 'asc');
      break;
    case 'title_desc':
      query = query.orderBy('name', 'desc');
      break;
    default:
      query = query.orderBy('pinned', 'desc').orderBy('name', 'asc');
  }

  const crises = await query.execute();

  res.json({ crises });
});

volunteerRouter.get('/crises/:id', async (req, res: Response<VolunteerCrisisResponse>) => {
  const { id } = zod.object({
    id: zod.coerce.number().int().positive('ID must be a positive number'),
  }).parse(req.params);

  const crisis = await database
    .selectFrom('crisis')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!crisis) {
    res.status(404);
    throw new Error('Crisis not found');
  }

  res.json({ crisis });
});

volunteerRouter.put('/profile', async (req, res: Response<VolunteerProfileResponse>) => {
  const body = volunteerProfileUpdateSchema.parse(req.body);
  const volunteerId = req.userJWT!.id;

  const existingVolunteer = await database
    .selectFrom('volunteer_account')
    .select([
      'first_name',
      'last_name',
      'email',
      'date_of_birth',
      'gender',
      'cv_path',
      'description',
    ])
    .where('id', '=', volunteerId)
    .executeTakeFirstOrThrow();

  const existingSkills = await database
    .selectFrom('volunteer_skill')
    .select('name')
    .where('volunteer_id', '=', volunteerId)
    .execute();

  const normalizedExistingSkills = normalizeSkillList(existingSkills.map(skill => skill.name));
  const normalizedIncomingSkills = body.skills !== undefined ? normalizeSkillList(body.skills) : undefined;

  const didSkillsChange = normalizedIncomingSkills !== undefined
    ? !areSkillListsEqual(normalizedIncomingSkills, normalizedExistingSkills)
    : false;

  const shouldRecomputeProfileVector = (
    (body.gender !== undefined && body.gender !== existingVolunteer.gender)
    || (body.cv_path !== undefined && body.cv_path !== existingVolunteer.cv_path)
    || (body.description !== undefined && body.description !== existingVolunteer.description)
    || didSkillsChange
  );

  await database.transaction().execute(async (trx) => {
    const volunteerUpdate: Partial<Omit<VolunteerAccountWithoutPassword, 'id'>> = {};

    if (body.gender !== undefined) volunteerUpdate.gender = body.gender;
    if (body.cv_path !== undefined) volunteerUpdate.cv_path = body.cv_path;
    if (body.description !== undefined) volunteerUpdate.description = body.description;
    if (Object.keys(volunteerUpdate).length > 0) {
      await trx
        .updateTable('volunteer_account')
        .set(volunteerUpdate)
        .where('id', '=', volunteerId)
        .execute();
    }

    if (didSkillsChange) {
      await trx
        .deleteFrom('volunteer_skill')
        .where('volunteer_id', '=', volunteerId)
        .execute();

      if (normalizedIncomingSkills && normalizedIncomingSkills.length > 0) {
        await trx
          .insertInto('volunteer_skill')
          .values(
            normalizedIncomingSkills.map(name => ({
              volunteer_id: volunteerId,
              name,
            })),
          )
          .execute();
      }
    }
  });

  if (shouldRecomputeProfileVector) {
    await recomputeVolunteerProfileVector(volunteerId);
  }

  const profile = await getVolunteerProfile(volunteerId);
  res.json(profile);
});

volunteerRouter.post('/reset-password', resetPassword);

volunteerRouter.use('/profile/cv', volunteerCvRouter);
volunteerRouter.use('/posting', volunteerPostingRouter);

export default volunteerRouter;

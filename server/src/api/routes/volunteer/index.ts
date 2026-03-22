import bcrypt from 'bcrypt';
import { Router, Response } from 'express';
import * as jose from 'jose';
import { sql } from 'kysely';
import zod from 'zod';

import volunteerCvRouter from './cv.js';
import {
  VolunteerCrisisResponse,
  VolunteerCreateResponse,
  VolunteerCertificateResponse,
  VolunteerMeResponse,
  VolunteerPinnedCrisesResponse,
  VolunteerProfileResponse,
} from './index.types.js';
import volunteerPostingRouter from './posting.js';
import resetPassword from '../../../auth/resetPassword.js';
import config from '../../../config.js';
import database from '../../../db/index.js';
import { type VolunteerAccountWithoutPassword, newVolunteerAccountSchema, volunteerAccountSchema } from '../../../db/tables.js';
import {
  recomputeVolunteerExperienceVector,
  recomputeVolunteerProfileVector,
} from '../../../services/embeddings/updates.js';
import { getVolunteerProfile } from '../../../services/volunteer/index.js';
import { authorizeOnly } from '../../authorization.js';

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
  'privacy',
] as const;

const volunteerProfileUserUpdateSchema = volunteerAccountSchema.omit({
  id: true,
  password: true,
  email: true,
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
    privacy: 'public' as const,
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

volunteerRouter.get('/certificate', async (req, res: Response<VolunteerCertificateResponse>) => {
  const volunteerId = req.userJWT!.id;

  const volunteer = await database
    .selectFrom('volunteer_account')
    .select(['id', 'first_name', 'last_name'])
    .where('id', '=', volunteerId)
    .executeTakeFirstOrThrow();

  const hoursPerPostingExpr = sql<number>`CASE
    WHEN organization_posting.end_date IS NULL OR organization_posting.end_time IS NULL
      THEN 0
    ELSE GREATEST(
      0,
      EXTRACT(EPOCH FROM (
        (organization_posting.end_date + organization_posting.end_time)
        - (organization_posting.start_date + organization_posting.start_time)
      )) / 3600.0
    )
  END`;

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

volunteerRouter.get('/crises/pinned', async (_req, res: Response<VolunteerPinnedCrisesResponse>) => {
  const crises = await database
    .selectFrom('crisis')
    .selectAll()
    .where('pinned', '=', true)
    .orderBy('created_at', 'desc')
    .execute();

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
      'privacy',
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
    (body.first_name !== undefined && body.first_name !== existingVolunteer.first_name)
    || (body.last_name !== undefined && body.last_name !== existingVolunteer.last_name)
    || (body.gender !== undefined && body.gender !== existingVolunteer.gender)
    || (body.cv_path !== undefined && body.cv_path !== existingVolunteer.cv_path)
    || (body.description !== undefined && body.description !== existingVolunteer.description)
    || didSkillsChange
  );

  await database.transaction().execute(async (trx) => {
    const volunteerUpdate: Partial<Omit<VolunteerAccountWithoutPassword, 'id'>> = {};

    if (body.first_name !== undefined) volunteerUpdate.first_name = body.first_name;
    if (body.last_name !== undefined) volunteerUpdate.last_name = body.last_name;
    if (body.date_of_birth !== undefined) volunteerUpdate.date_of_birth = body.date_of_birth;
    if (body.gender !== undefined) volunteerUpdate.gender = body.gender;
    if (body.cv_path !== undefined) volunteerUpdate.cv_path = body.cv_path;
    if (body.description !== undefined) volunteerUpdate.description = body.description;
    if (body.privacy !== undefined) volunteerUpdate.privacy = body.privacy;

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

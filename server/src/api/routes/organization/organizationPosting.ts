import { Router } from 'express';

import database from '../../../db/index.js';
import { newOrganizationPostingSchema, type NewOrganizationPosting } from '../../../db/tables.js';

const postingRouter = Router();

postingRouter.post('/posting', async (req, res) => {
  const body: NewOrganizationPosting = newOrganizationPostingSchema.parse(req.body);
  const orgId = req.userJWT!.id;

  const posting = await database.transaction().execute(async (trx) => {
    const newPosting = await trx
      .insertInto('organization_posting')
      .values({
        organization_id: orgId,
        title: body.title,
        description: body.description,
        latitude: body.latitude ?? undefined,
        longitude: body.longitude ?? undefined,
        max_volunteers: body.max_volunteers ?? undefined,
        start_timestamp: body.start_timestamp,
        end_timestamp: body.end_timestamp ?? undefined,
        minimum_age: body.minimum_age ?? undefined,
        is_open: body.is_open ?? true,
        location_name: body.location_name,
      })
      .returningAll()
      .executeTakeFirst();

    if (!newPosting) {
      throw new Error('Failed to create posting');
    }

    if (body.skills && body.skills.length > 0) {
      const skillRows = body.skills.map(skill => ({
        posting_id: newPosting.id,
        name: skill,
      }));

      await trx.insertInto('posting_skill').values(skillRows).execute();
    }

    return newPosting;
  });

  res.json({ success: true, posting: posting });
});

postingRouter.get('/posting', async (req, res) => {
  const orgId = req.userJWT!.id;

  const posting = await database
    .selectFrom('organization_posting')
    .selectAll()
    .where('organization_id', '=', orgId)
    .orderBy('start_timestamp', 'asc')
    .execute();

  res.json({ posting });
});

postingRouter.get('/me', async (req, res) => {
  const organization = await database
    .selectFrom('organization_account')
    .selectAll()
    .where('id', '=', req.userJWT!.id)
    .executeTakeFirstOrThrow();

  // @ts-expect-error: do not return the password
  delete organization.password;

  res.json({ organization });
});

export default postingRouter;

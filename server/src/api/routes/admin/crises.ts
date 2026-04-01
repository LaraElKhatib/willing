import { Router, type Response } from 'express';
import { type Kysely } from 'kysely';
import zod from 'zod';

import {
  type AdminCrisisCreateResponse,
  type AdminCrisisDeleteResponse,
  type AdminCrisisPinResponse,
  type AdminCrisisUpdateResponse,
  type AdminCrisesResponse,
} from './crises.types.ts';
import { type Database, newCrisisSchema } from '../../../db/tables/index.ts';
import { parseListQuery, parseOptionalBooleanQueryParam } from '../utils/listQuery.ts';

const crisisParamsSchema = zod.object({
  id: zod.coerce.number().int().positive('ID must be a positive number'),
});

const crisisPinBodySchema = zod.object({
  pinned: zod.boolean(),
});

function createAdminCrisesRouter(db: Kysely<Database>) {
  const adminCrisesRouter = Router();

  adminCrisesRouter.get('/', async (req, res: Response<AdminCrisesResponse>) => {
    const { search, sortBy, sortDir } = parseListQuery(req.query, {
      allowedSortBy: ['pinned', 'created_at', 'name'],
      defaultSortBy: 'pinned',
    });
    const pinnedFilter = parseOptionalBooleanQueryParam(req.query.pinned);

    let crisesQuery = db
      .selectFrom('crisis')
      .selectAll();

    if (search) {
      const searchPattern = `%${search}%`;
      crisesQuery = crisesQuery.where(eb => eb.or([
        eb('crisis.name', 'ilike', searchPattern),
        eb('crisis.description', 'ilike', searchPattern),
      ]));
    }

    if (pinnedFilter !== undefined) {
      crisesQuery = crisesQuery.where('crisis.pinned', '=', pinnedFilter);
    }

    switch (sortBy) {
      case 'name':
        crisesQuery = crisesQuery.orderBy('crisis.name', sortDir);
        break;
      case 'created_at':
        crisesQuery = crisesQuery
          .orderBy('crisis.created_at', sortDir)
          .orderBy('crisis.id', sortDir);
        break;
      case 'pinned':
      default:
        crisesQuery = crisesQuery
          .orderBy('crisis.pinned', sortDir)
          .orderBy('crisis.created_at', 'desc')
          .orderBy('crisis.id', 'desc');
        break;
    }

    const crises = await crisesQuery.execute();

    res.json({ crises });
  });

  adminCrisesRouter.post('/', async (req, res: Response<AdminCrisisCreateResponse>) => {
    const body = newCrisisSchema.parse(req.body);

    const crisis = await db
      .insertInto('crisis')
      .values({ ...body, pinned: false })
      .returningAll()
      .executeTakeFirst();

    if (!crisis) {
      res.status(500);
      throw new Error('Failed to create crisis');
    }

    res.status(201).json({ crisis });
  });

  adminCrisesRouter.put('/:id', async (req, res: Response<AdminCrisisUpdateResponse>) => {
    const { id } = crisisParamsSchema.parse(req.params);
    const body = newCrisisSchema.parse(req.body);

    const crisis = await db
      .updateTable('crisis')
      .set(body)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!crisis) {
      res.status(404);
      throw new Error('Crisis not found');
    }

    res.json({ crisis });
  });

  adminCrisesRouter.patch('/:id/pin', async (req, res: Response<AdminCrisisPinResponse>) => {
    const { id } = crisisParamsSchema.parse(req.params);
    const { pinned } = crisisPinBodySchema.parse(req.body);

    const crisis = await db
      .updateTable('crisis')
      .set({ pinned })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!crisis) {
      res.status(404);
      throw new Error('Crisis not found');
    }

    res.json({ crisis });
  });

  adminCrisesRouter.delete('/:id', async (req, res: Response<AdminCrisisDeleteResponse>) => {
    const { id } = crisisParamsSchema.parse(req.params);

    const deleted = await db
      .deleteFrom('crisis')
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst();

    if (!deleted) {
      res.status(404);
      throw new Error('Crisis not found');
    }

    res.json({});
  });

  return adminCrisesRouter;
}

export default createAdminCrisesRouter;

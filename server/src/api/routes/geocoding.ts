import { Router, type Response } from 'express';
import { type Kysely } from 'kysely';
import zod from 'zod';

import { type Database } from '../../db/tables/index.ts';
import queryLocationIQ from '../../services/locationiq/index.ts';

import type { GeocodingSearchResponse } from './geocoding.types.ts';

function createGeocodingRouter(_db: Kysely<Database>) {
  const geocodingRouter = Router();

  geocodingRouter.get('/search', async (req, res: Response<GeocodingSearchResponse>) => {
    const { query } = zod.object({
      query: zod.string().trim().min(2),
    }).parse(req.query);

    const addresses = await queryLocationIQ(query);
    res.json(addresses);
  });

  return geocodingRouter;
};

export default createGeocodingRouter;

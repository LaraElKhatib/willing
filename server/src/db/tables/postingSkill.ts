import zod from 'zod';

import { idSchema } from '../../schemas/index.ts';

import type { WithGeneratedID } from './shared.ts';

export const postingSkillSchema = zod.object({
  id: idSchema,
  posting_id: zod.number().min(1, 'Posting ID is required'),
  name: zod.string().min(1, 'Skill name is required'),
});

export type PostingSkill = zod.infer<typeof postingSkillSchema>;

export type PostingSkillTable = WithGeneratedID<PostingSkill>;

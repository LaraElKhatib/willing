import zod from 'zod';

import { idSchema } from '../../schemas/index.js';

import type { WithGeneratedID } from './shared.js';

export const volunteerSkillSchema = zod.object({
  id: idSchema,
  volunteer_id: idSchema,
  name: zod.string().min(1, 'Skill name is required'),
});

export type VolunteerSkill = zod.infer<typeof volunteerSkillSchema>;

export type VolunteerSkillTable = WithGeneratedID<VolunteerSkill>;

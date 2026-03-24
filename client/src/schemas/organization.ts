import { z } from 'zod';

import { newOrganizationRequestSchema } from '../../../server/src/db/tables';

export const organizationRequestFormSchema = newOrganizationRequestSchema
  .omit({ latitude: true, longitude: true })
  .extend({
    email: z.email('Invalid email'),
  });

export type OrganizationRequestFormData = z.infer<typeof organizationRequestFormSchema>;

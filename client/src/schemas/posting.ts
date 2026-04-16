import { z } from 'zod';

import { newPostingSchema } from '../../../server/src/db/tables';

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const notPastDate = (date: string, ctx: z.RefinementCtx, field: string, label: string) => {
  if (date && date < getTodayDateString()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} cannot be in the past`,
      path: [field],
    });
  }
};

export const organizationPostingFormSchema = newPostingSchema
  .omit({
    latitude: true,
    longitude: true,
    start_date: true,
    start_time: true,
    end_date: true,
    end_time: true,
    is_closed: true,
    allows_partial_attendance: true,
  })
  .extend({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    start_date: z.string().min(1, 'Start date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_date: z.string().min(1, 'End date is required'),
    end_time: z.string().min(1, 'End time is required'),
    max_volunteers: z.string().optional(),
    minimum_age: z.string().optional(),
    automatic_acceptance: z.boolean(),
    allows_partial_attendance: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    notPastDate(data.start_date, ctx, 'start_date', 'Start date');
    notPastDate(data.end_date, ctx, 'end_date', 'End date');
  });

export type OrganizationPostingFormData = z.infer<typeof organizationPostingFormSchema>;

export const organizationPostingEditFormSchema = newPostingSchema
  .omit({
    latitude: true,
    longitude: true,
    start_date: true,
    start_time: true,
    end_date: true,
    end_time: true,
  })
  .extend({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    start_date: z.string().min(1, 'Start date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_date: z.string().min(1, 'End date is required'),
    end_time: z.string().min(1, 'End time is required'),
    max_volunteers: z.string().optional(),
    minimum_age: z.string().optional(),
    automatic_acceptance: z.boolean(),
    allows_partial_attendance: z.boolean().optional(),
    is_closed: z.boolean(),
  });

export type OrganizationPostingEditFormData = z.infer<typeof organizationPostingEditFormSchema>;

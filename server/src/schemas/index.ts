import zod from 'zod';

export const idSchema = zod.number().int().positive();

export const emailSchema = zod.email('Invalid email').transform(val => val.toLowerCase().trim());

export const genderSchema = zod.enum(['male', 'female', 'other'], 'Gender should be \'female\', \'male\', or \'other\' ');
export type Gender = zod.infer<typeof genderSchema>;

export const loginInfoSchema = zod.object({
  email: emailSchema,
  password: zod.string(),
});

export type LoginInfo = zod.infer<typeof loginInfoSchema>;

export const websiteSchema = zod.url('URL is invalid')
  .trim()
  .refine(url => /^https?:\/\//i.test(url), {
    message: 'URL must start with http:// or https://',
  })
  .refine((url) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.includes('.') && !hostname.endsWith('.');
    } catch {
      return false;
    }
  }, {
    message: 'URL is invalid',
  });

export const passwordSchema = zod
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const latitudeSchema = zod
  .number()
  .min(-90, { message: 'Latitude must be >= -90' })
  .max(90, { message: 'Latitude must be <= 90' });

export const longitudeSchema = zod
  .number()
  .min(-180, { message: 'Longitude must be >= -180' })
  .max(180, { message: 'Longitude must be <= 180' });

import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: z.email('Invalid email'),
});

export type ForgotPasswordRequestFormData = z.infer<typeof forgotPasswordRequestSchema>;

export const forgotPasswordResetSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ForgotPasswordResetFormData = z.infer<typeof forgotPasswordResetSchema>;

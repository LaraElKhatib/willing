import { OrganizationAccountWithoutPassword, VolunteerAccountWithoutPassword } from '../../db/tables/index.js';

export type UserLoginResponse = {
  token: string;
  role: 'volunteer' | 'organization';
  volunteer?: VolunteerAccountWithoutPassword;
  organization?: OrganizationAccountWithoutPassword;
};

export type UserForgotPasswordResponse = object;

export type UserForgotPasswordResetResponse = object;

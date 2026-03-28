import { type ResetPasswordResponse } from '../../../auth/resetPassword.ts';
import {
  type AdminAccountWithoutPassword,
  type OrganizationAccountWithoutPassword,
  type OrganizationRequest,
} from '../../../db/tables/index.ts';

export type AdminLoginResponse = {
  token: string;
  admin: AdminAccountWithoutPassword;
};

export type AdminMeResponse = {
  admin: AdminAccountWithoutPassword;
};

export type AdminOrganizationRequestsResponse = {
  organizationRequests: OrganizationRequest[];
};

export type AdminOrganizationRequestReviewResponse = object | {
  organization: OrganizationAccountWithoutPassword;
};

export type AdminResetPasswordResponse = ResetPasswordResponse;

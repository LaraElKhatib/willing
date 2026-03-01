import { ResetPasswordResponse } from '../../../auth/resetPassword.js';
import { OrganizationAccountWithoutPassword } from '../../../db/tables.js';
import { Success } from '../../../types.js';

export type OrganizationRequestResponse = Success;

export type OrganizationMeResponse = {
  organization: OrganizationAccountWithoutPassword;
};

export type OrganizationResetPasswordResponse = ResetPasswordResponse;

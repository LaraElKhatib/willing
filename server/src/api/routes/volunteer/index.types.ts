import { ResetPasswordResponse } from '../../../auth/resetPassword.js';
import { Crisis, VolunteerAccountWithoutPassword } from '../../../db/tables.js';

import type { VolunteerProfileData } from '../../../services/volunteer/index.js';

export type VolunteerCreateResponse = {
  volunteer: VolunteerAccountWithoutPassword;
  token: string;
};

export type VolunteerMeResponse = {
  volunteer: VolunteerAccountWithoutPassword;
};

export type VolunteerProfileResponse = VolunteerProfileData;

export type VolunteerPinnedCrisesResponse = {
  crises: Crisis[];
};

export type VolunteerCrisisResponse = {
  crisis: Crisis;
};

export type VolunteerCertificateOrganization = {
  id: number;
  name: string;
  hours: number;
  hours_threshold: number | null;
  certificate_feature_enabled: boolean;
  eligible: boolean;
  logo_path: string | null;
  signatory_name: string | null;
  signatory_position: string | null;
  signature_path: string | null;
};

export type VolunteerCertificateResponse = {
  volunteer: Pick<VolunteerAccountWithoutPassword, 'id' | 'first_name' | 'last_name'>;
  total_hours: number;
  organizations: VolunteerCertificateOrganization[];
  platform_certificate: {
    signatory_name: string | null;
    signatory_position: string | null;
    signature_path: string | null;
  } | null;
};

export type VolunteerResetPasswordResponse = ResetPasswordResponse;

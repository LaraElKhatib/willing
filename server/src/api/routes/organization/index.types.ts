import { ResetPasswordResponse } from '../../../auth/resetPassword.js';
import { Crisis, OrganizationAccountWithoutPassword, OrganizationAccountWithoutPasswordAndVector, OrganizationPostingWithoutVectors, PostingSkill } from '../../../db/tables/index.js';
import { SuccessResponse } from '../../../types.js';
import type { VolunteerProfileData } from '../../../services/volunteer/index.js';

export type OrganizationRequestResponse = SuccessResponse;

export type OrganizationGetLogoFileResponse = never;
export type OrganizationGetSignatureFileResponse = never;
export type OrganizationVolunteerCvDownloadResponse = never;

export type OrganizationProfileResponse = {
  organization: OrganizationAccountWithoutPasswordAndVector;
  postings: (OrganizationPostingWithoutVectors & { skills: PostingSkill[] })[];
};

export type OrganizationGetMeResponse = {
  organization: OrganizationAccountWithoutPassword;
};

export type OrganizationUpdateProfileResponse = {
  organization: OrganizationAccountWithoutPassword;
};

export type OrganizationUploadLogoResponse = {
  organization: OrganizationAccountWithoutPassword;
};

export type OrganizationDeleteLogoResponse = {
  organization: OrganizationAccountWithoutPassword;
};

export type OrganizationPinnedCrisesResponse = {
  crises: Crisis[];
};

export type OrganizationCrisesResponse = {
  crises: Crisis[];
};

export type OrganizationCrisisResponse = {
  crisis: Crisis;
};

export type OrganizationVolunteerProfileResponse = {
  profile: VolunteerProfileData;
};

export type OrganizationResetPasswordResponse = ResetPasswordResponse;

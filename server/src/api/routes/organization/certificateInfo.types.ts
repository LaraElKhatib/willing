import { type OrganizationCertificateInfo } from '../../../db/tables/index.ts';
import { type SuccessResponse } from '../../../types.ts';

export type GetCertificateInfoResponse = {
  certificateInfo: OrganizationCertificateInfo | null;
};

export type UpdateCertificateInfoResponse = {
  certificateInfo: OrganizationCertificateInfo;
};

export type UploadCertificateSignatureResponse = {
  certificateInfo: OrganizationCertificateInfo;
};

export type DeleteCertificateSignatureResponse = SuccessResponse;

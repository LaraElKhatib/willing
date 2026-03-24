import { OrganizationCertificateInfo } from '../../../db/tables/index.js';
import { SuccessResponse } from '../../../types.js';

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

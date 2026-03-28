import { type PlatformCertificateSettings } from '../../../db/tables/index.ts';
import { type SuccessResponse } from '../../../types.ts';

export type AdminCertificateSettingsGetResponse = {
  settings: PlatformCertificateSettings | null;
};

export type AdminCertificateSettingsUpdateResponse = {
  settings: PlatformCertificateSettings;
};

export type AdminCertificateSettingsUploadSignatureResponse = {
  settings: PlatformCertificateSettings;
};

export type AdminCertificateSettingsDeleteSignatureResponse = SuccessResponse;

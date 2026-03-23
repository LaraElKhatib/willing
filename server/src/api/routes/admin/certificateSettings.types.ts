import { PlatformCertificateSettings } from '../../../db/tables/index.js';
import { SuccessResponse } from '../../../types.js';

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

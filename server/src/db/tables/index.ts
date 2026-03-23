import type { AdminAccountTable } from './adminAccount.js';
import type { CrisisTable } from './crisis.js';
import type { EnrollmentTable } from './enrollment.js';
import type { EnrollmentApplicationTable } from './enrollmentApplication.js';
import type { OrganizationAccountTable } from './organizationAccount.js';
import type { OrganizationCertificateInfoTable } from './organizationCertificateInfo.js';
import type { OrganizationPostingTable } from './organizationPosting.js';
import type { OrganizationRequestTable } from './organizationRequest.js';
import type { PasswordResetTokenTable } from './passwordResetToken.js';
import type { PlatformCertificateSettingsTable } from './platformCertificateSettings.js';
import type { PostingSkillTable } from './postingSkill.js';
import type { VolunteerAccountTable } from './volunteerAccount.js';
import type { VolunteerSkillTable } from './volunteerSkill.js';

export * from './adminAccount.js';
export * from './crisis.js';
export * from './enrollmentApplication.js';
export * from './enrollment.js';
export * from './organizationAccount.js';
export * from './organizationCertificateInfo.js';
export * from './organizationPosting.js';
export * from './organizationRequest.js';
export * from './passwordResetToken.js';
export * from './postingSkill.js';
export * from './volunteerAccount.js';
export * from './platformCertificateSettings.js';
export * from './volunteerSkill.js';

export interface Database {
  volunteer_account: VolunteerAccountTable;
  organization_request: OrganizationRequestTable;
  organization_account: OrganizationAccountTable;
  admin_account: AdminAccountTable;
  crisis: CrisisTable;
  organization_posting: OrganizationPostingTable;
  posting_skill: PostingSkillTable;
  volunteer_skill: VolunteerSkillTable;
  password_reset_token: PasswordResetTokenTable;
  enrollment: EnrollmentTable;
  enrollment_application: EnrollmentApplicationTable;
  organization_certificate_info: OrganizationCertificateInfoTable;
  platform_certificate_settings: PlatformCertificateSettingsTable;
}

export type PublicHomeStatsResponse = {
  totalOpportunities: number;
  totalOrganizations: number;
  totalVolunteers: number;
  newOpportunitiesThisWeek: number;
  newOrganizationsThisWeek: number;
  newVolunteersThisWeek: number;
};

export type PublicCertificateSignatureResponse = never;

export type PublicCertificateVerificationResponse = {
  valid: boolean;
  message: string;
  issued_at?: string;
  certificate_type?: 'volunteer_hours_certificate';
};

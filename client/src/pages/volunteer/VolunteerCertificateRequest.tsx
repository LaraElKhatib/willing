import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useVolunteer } from '../../auth/useUsers';
import PageHeader from '../../components/layout/PageHeader';
import Loading from '../../components/Loading';
import requestServer, { SERVER_BASE_URL } from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { VolunteerCertificateResponse } from '../../../../server/src/api/types';

const MAX_ORGANIZATION_SELECTION = 4;
const CERTIFICATE_PREVIEW_ID = 'certificate-preview';
const formatHours = (value: number) => Math.floor(value);

function VolunteerCertificateRequest() {
  const volunteer = useVolunteer();
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<number[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [certificateGeneratedAt, setCertificateGeneratedAt] = useState<Date | null>(null);

  const loadCertificateData = useCallback(async () => {
    return requestServer<VolunteerCertificateResponse>('/volunteer/certificate', { includeJwt: true });
  }, []);

  const { data, loading, error, trigger } = useAsync<VolunteerCertificateResponse, []>(loadCertificateData, {
    immediate: true,
  });

  const rankedOrganizations = useMemo(
    () => [...(data?.organizations ?? [])].sort((left, right) => right.hours - left.hours),
    [data?.organizations],
  );

  const organizationsWithEligibility = useMemo(
    () => rankedOrganizations,
    [rankedOrganizations],
  );

  const eligibleOrganizations = useMemo(
    () => organizationsWithEligibility.filter(org => org.eligible),
    [organizationsWithEligibility],
  );

  const totalHours = useMemo(
    () => Number(data?.total_hours ?? 0),
    [data?.total_hours],
  );

  const selectedOrganizations = useMemo(
    () => organizationsWithEligibility
      .filter(org => selectedOrganizationIds.includes(org.id))
      .sort((left, right) => right.hours - left.hours),
    [organizationsWithEligibility, selectedOrganizationIds],
  );

  const volunteerName = useMemo(() => {
    const firstName = data?.volunteer.first_name ?? volunteer?.first_name ?? '';
    const lastName = data?.volunteer.last_name ?? volunteer?.last_name ?? '';
    return `${firstName} ${lastName}`.trim() || 'Volunteer';
  }, [data?.volunteer.first_name, data?.volunteer.last_name, volunteer?.first_name, volunteer?.last_name]);

  const platformSignatureUrl = useMemo(() => {
    if (!data?.platform_certificate?.signature_path) return null;
    return `${SERVER_BASE_URL}/public/certificate-signature?v=${encodeURIComponent(data.platform_certificate.signature_path)}`;
  }, [data?.platform_certificate?.signature_path]);

  const toggleOrganization = (organizationId: number, eligible: boolean) => {
    if (!eligible) return;

    setSelectionError(null);
    setCertificateGeneratedAt(null);

    setSelectedOrganizationIds((current) => {
      if (current.includes(organizationId)) {
        return current.filter(id => id !== organizationId);
      }

      if (current.length >= MAX_ORGANIZATION_SELECTION) {
        setSelectionError(`You can select up to ${MAX_ORGANIZATION_SELECTION} organizations.`);
        return current;
      }

      return [...current, organizationId];
    });
  };

  const createCertificate = () => {
    setSelectionError(null);
    setCertificateGeneratedAt(new Date());
  };

  const downloadCertificateAsPdf = () => {
    if (!certificateGeneratedAt) return;
    window.print();
  };

  return (
    <div className="grow bg-base-200">
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 297mm;
              height: 210mm;
              background: #fff !important;
            }

            body * {
              visibility: hidden;
            }

            #${CERTIFICATE_PREVIEW_ID},
            #${CERTIFICATE_PREVIEW_ID} * {
              visibility: visible;
            }

            #${CERTIFICATE_PREVIEW_ID} {
              position: absolute;
              left: 0;
              top: 0;
              width: 297mm;
              height: 210mm;
              max-height: 210mm;
              box-sizing: border-box;
              padding: 8mm 10mm 8mm;
              margin: 0;
              overflow: hidden;
              background: #fff !important;
              color: #111 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .certificate-slot {
              border: 1px solid #ddd !important;
              min-height: 18mm !important;
            }

            .certificate-sign-line {
              border-bottom: 1px solid #222 !important;
              height: 0 !important;
            }

            .certificate-meta p {
              white-space: nowrap !important;
            }

            .certificate-name {
              font-size: 42px !important;
              margin-top: 10px !important;
            }

            .certificate-main-copy {
              font-size: 22px !important;
              margin-top: 12px !important;
              line-height: 1.25 !important;
            }

            .certificate-org-section {
              margin-top: 4px !important;
              min-height: 18mm !important;
            }

            .certificate-footer {
              margin-top: 4px !important;
              padding-bottom: 0 !important;
              break-inside: avoid !important;
            }

            .certificate-footer * {
              color: #111 !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      <div className="p-6 md:container mx-auto">
        <PageHeader
          title="Generate Certificate"
          subtitle="Review your volunteering stats, then generate your certificate."
          showBack
          defaultBackTo="/volunteer/profile"
          icon={Award}
        />

        {loading && (
          <div className="flex justify-center mt-8">
            <Loading size="xl" />
          </div>
        )}

        {error && (
          <div className="mt-4 no-print">
            <div className="alert alert-error">
              <span>{error.message || 'Failed to load certificate data.'}</span>
            </div>
            <button className="btn btn-outline mt-3" onClick={() => { void trigger(); }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-4 mt-4 md:grid-cols-3 no-print">
              <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <p className="text-sm opacity-70">Total Volunteering Hours</p>
                  <p className="text-3xl font-bold">{formatHours(totalHours)}</p>
                </div>
              </div>
              <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <p className="text-sm opacity-70">Organizations Involved</p>
                  <p className="text-3xl font-bold">{rankedOrganizations.length}</p>
                </div>
              </div>
              <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <p className="text-sm opacity-70">Eligible Organizations</p>
                  <p className="text-3xl font-bold">{eligibleOrganizations.length}</p>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md mt-4 no-print">
              <div className="card-body">
                <h5 className="font-bold text-lg">Select Organizations (Max 4)</h5>
                <p className="text-sm opacity-70">
                  Ranked by your attended hours. Only organizations meeting threshold and certificate settings are selectable.
                </p>

                {selectionError && (
                  <div className="alert alert-error mt-3">
                    <AlertCircle size={16} />
                    <span>{selectionError}</span>
                  </div>
                )}

                <div className="space-y-2 mt-3">
                  {organizationsWithEligibility.map((organization, index) => {
                    const selected = selectedOrganizationIds.includes(organization.id);

                    return (
                      <label
                        key={organization.id}
                        className={`flex items-center justify-between gap-3 rounded-box border p-3 ${
                          organization.eligible ? 'cursor-pointer border-base-300' : 'opacity-60 border-base-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="badge badge-ghost">{`#${index + 1}`}</span>
                          <div>
                            <p className="font-semibold">{organization.name}</p>
                            <p className="text-sm opacity-70">
                              Hours:
                              {' '}
                              {formatHours(organization.hours)}
                              {' '}
                              |
                              {' '}
                              Threshold:
                              {' '}
                              {organization.hours_threshold ?? '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {organization.eligible
                            ? <span className="badge badge-success">Eligible</span>
                            : <span className="badge badge-ghost">Not eligible</span>}
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={selected}
                            disabled={!organization.eligible}
                            onChange={() => toggleOrganization(organization.id, organization.eligible)}
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <button className="btn btn-primary" onClick={createCertificate}>
                    <FileText size={16} />
                    Create Certificate
                  </button>
                </div>
              </div>
            </div>

            {certificateGeneratedAt && (
              <div className="card bg-base-100 shadow-md mt-4 no-print">
                <div className="card-body">
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="font-bold text-lg">Certificate Preview</h5>
                    <button className="btn btn-outline" onClick={downloadCertificateAsPdf}>
                      <Download size={16} />
                      Download as PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {certificateGeneratedAt && (
              <div
                id={CERTIFICATE_PREVIEW_ID}
                className="mt-4 bg-white text-black border border-neutral-200 rounded-box pt-8 px-8 pb-4 shadow-xl text-[1.15rem]"
                style={{ aspectRatio: '1.4142 / 1' }}
              >
                <div className="h-full grid grid-rows-[auto,1fr,auto]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <img src="/willing.svg" alt="Willing Logo" className="h-7 w-7" />
                          <p className="text-lg uppercase tracking-[0.2em] text-primary font-semibold">Willing Platform</p>
                        </div>
                        <h2 className="text-6xl font-extrabold mt-2">Certificate of Volunteering</h2>
                        <div className="flex items-center gap-2 mt-3 text-success">
                          <CheckCircle2 size={18} />
                          <span className="font-semibold text-lg">Participation Verified</span>
                        </div>
                      </div>
                      <div className="certificate-meta text-right text-lg opacity-70">
                        <p>Certificate ID: WL-CERT-SKELETON</p>
                        <p className="mt-1">
                          Generated:
                          {' '}
                          {certificateGeneratedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center px-8">
                    <div className="text-center max-w-4xl mx-auto">
                      <p className="text-3xl">This is to certify that</p>
                      <p className="certificate-name text-7xl font-bold text-primary mt-5">{volunteerName}</p>
                      <div className="w-[930px] max-w-full mx-auto border-b-2 border-primary/60 mt-3" />
                      <p className="certificate-main-copy text-3xl mt-6 leading-relaxed">
                        has contributed a total of
                        {' '}
                        <span className="font-bold">{formatHours(totalHours)}</span>
                        {' '}
                        volunteering hours through Willing.
                        This certificate recognizes meaningful service and participation across the platform.
                      </p>
                    </div>
                  </div>

                  <div className="certificate-org-section mt-3">
                    <div className="min-h-32">
                      {selectedOrganizations.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {Array.from({ length: MAX_ORGANIZATION_SELECTION }).map((_, index) => {
                            const org = selectedOrganizations[index];
                            if (!org) {
                              return <div key={`empty-org-slot-${index}`} className="min-h-32" aria-hidden />;
                            }

                            const logoUrl = org.logo_path
                              ? `${SERVER_BASE_URL}/organization/${org.id}/logo`
                              : null;
                            const signatureUrl = org.signature_path
                              ? `${SERVER_BASE_URL}/organization/${org.id}/signature`
                              : null;

                            return (
                              <div key={org.id} className="certificate-slot rounded-box border border-neutral-300 bg-gradient-to-b from-white to-neutral-50 p-4 min-h-36 shadow-sm">
                                <div className="flex items-center gap-3">
                                  {logoUrl
                                    ? (
                                        <div className="h-10 w-10 rounded-md border border-neutral-200 bg-white flex items-center justify-center overflow-hidden">
                                          <img src={logoUrl} alt={`${org.name} logo`} className="h-8 w-8 object-contain" />
                                        </div>
                                      )
                                    : (
                                        <div className="h-10 w-10 rounded-md border border-neutral-200 bg-white flex items-center justify-center">
                                          <Building2 size={18} />
                                        </div>
                                      )}
                                  <p className="font-bold text-xl leading-tight line-clamp-2">{org.name}</p>
                                </div>
                                <p className="text-lg mt-3">
                                  Hours:
                                  {' '}
                                  <span className="font-bold">{formatHours(org.hours)}</span>
                                </p>
                                {signatureUrl
                                  ? <img src={signatureUrl} alt={`${org.name} signature`} className="mt-3 h-8 w-auto object-contain" />
                                  : <div className="mt-3 h-8" />}
                                <div className="certificate-sign-line h-6 border-b border-neutral-400" />
                                <p className="text-sm mt-2 font-semibold">{org.signatory_name || ''}</p>
                                <p className="text-xs opacity-70">{org.signatory_position || ''}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="certificate-footer mt-4 flex items-end">
                      <div className="w-72">
                        <p className="text-base uppercase tracking-wide opacity-60">Willing Admin Signature</p>
                        {platformSignatureUrl
                          ? <img src={platformSignatureUrl} alt="Willing admin signature" className="h-8 w-auto object-contain mt-2" />
                          : <div className="mt-2 h-8" />}
                        <div className="certificate-sign-line h-8 border-b border-neutral-300 mt-1" />
                        <p className="text-base opacity-70 mt-1">{data?.platform_certificate?.signatory_name || 'Name'}</p>
                        <p className="text-sm opacity-60">
                          {data?.platform_certificate?.signatory_position || 'Title'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default VolunteerCertificateRequest;

import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useVolunteer } from '../../auth/useUsers';
import PageHeader from '../../components/layout/PageHeader';

type OrganizationHours = {
  id: number;
  name: string;
  hours: number;
  threshold: number;
};

const MAX_ORGANIZATION_SELECTION = 4;
const CERTIFICATE_PREVIEW_ID = 'certificate-preview';

const mockOrganizationHours: OrganizationHours[] = [
  { id: 1, name: 'Green Lebanon Initiative', hours: 74, threshold: 30 },
  { id: 2, name: 'Food Bridge Network', hours: 61, threshold: 40 },
  { id: 3, name: 'EduReach Program', hours: 44, threshold: 35 },
  { id: 4, name: 'City Health Volunteers', hours: 32, threshold: 50 },
  { id: 5, name: 'Youth Mentorship Hub', hours: 29, threshold: 20 },
  { id: 6, name: 'Community Relief Team', hours: 17, threshold: 25 },
];

function VolunteerCertificateRequest() {
  const volunteer = useVolunteer();
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<number[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [certificateGeneratedAt, setCertificateGeneratedAt] = useState<Date | null>(null);

  const rankedOrganizations = useMemo(
    () => [...mockOrganizationHours].sort((left, right) => right.hours - left.hours),
    [],
  );

  const organizationsWithEligibility = useMemo(
    () => rankedOrganizations.map(org => ({ ...org, eligible: org.hours >= org.threshold })),
    [rankedOrganizations],
  );

  const eligibleOrganizations = useMemo(
    () => organizationsWithEligibility.filter(org => org.eligible),
    [organizationsWithEligibility],
  );

  const totalHours = useMemo(
    () => rankedOrganizations.reduce((sum, org) => sum + org.hours, 0),
    [rankedOrganizations],
  );

  const selectedOrganizations = useMemo(
    () => organizationsWithEligibility
      .filter(org => selectedOrganizationIds.includes(org.id))
      .sort((left, right) => right.hours - left.hours),
    [organizationsWithEligibility, selectedOrganizationIds],
  );

  const volunteerName = useMemo(() => {
    const firstName = volunteer?.first_name ?? '';
    const lastName = volunteer?.last_name ?? '';
    return `${firstName} ${lastName}`.trim() || 'Volunteer';
  }, [volunteer?.first_name, volunteer?.last_name]);

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
              box-sizing: border-box;
              padding: 10mm 12mm 10mm;
              margin: 0;
              overflow: visible;
              background: #fff !important;
              color: #111 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }

            .certificate-slot {
              border: 1px solid #ddd !important;
              min-height: 22mm !important;
            }

            .certificate-sign-line {
              border-bottom: 1px solid #222 !important;
              height: 0 !important;
            }

            .certificate-meta p {
              white-space: nowrap !important;
            }

            .certificate-name {
              font-size: 52px !important;
              margin-top: 14px !important;
            }

            .certificate-main-copy {
              font-size: 30px !important;
              margin-top: 16px !important;
            }

            .certificate-org-section {
              margin-top: 8px !important;
              min-height: 22mm !important;
            }

            .certificate-footer {
              margin-top: 8px !important;
              padding-bottom: 2mm !important;
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
          subtitle="Frontend skeleton: organization eligibility and certificate preview."
          showBack
          defaultBackTo="/volunteer/profile"
          icon={Award}
        />

        <div className="alert alert-info mt-4 no-print">
          <span>
            Backend integration is pending. Statistics and eligibility are currently mock values.
          </span>
        </div>

        <div className="grid gap-4 mt-4 md:grid-cols-3 no-print">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <p className="text-sm opacity-70">Total Volunteering Hours</p>
              <p className="text-3xl font-bold">{totalHours}</p>
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
              Ranked by your total hours with each organization. Optional for certificate generation.
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
                          {organization.hours}
                          {' '}
                          |
                          {' '}
                          Threshold:
                          {' '}
                          {organization.threshold}
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
                    <span className="font-bold">{totalHours}</span>
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

                        return (
                          <div key={org.id} className="certificate-slot rounded-box border border-neutral-300 p-3 min-h-32">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} />
                              <p className="font-semibold text-lg line-clamp-2">{org.name}</p>
                            </div>
                            <p className="text-base mt-2">
                              Hours:
                              {' '}
                              <span className="font-semibold">{org.hours}</span>
                            </p>
                            <div className="mt-3 h-6" />
                            <div className="certificate-sign-line h-6 border-b border-neutral-300" />
                            <div className="mt-3 h-6" />
                            <div className="certificate-sign-line h-6 border-b border-neutral-300" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="certificate-footer mt-4 flex items-end">
                  <div className="w-72">
                    <p className="text-base uppercase tracking-wide opacity-60">Willing Admin Signature</p>
                    <div className="certificate-sign-line h-8 border-b border-neutral-300 mt-2" />
                    <p className="text-base opacity-70 mt-1">Name & title</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VolunteerCertificateRequest;

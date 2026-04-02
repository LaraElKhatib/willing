import { Building2, Flag, Inbox, RotateCcw, UserRound } from 'lucide-react';
import { useCallback } from 'react';

import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { AdminReportsResponse } from '../../../../server/src/api/types';

function AdminReports() {
  const fetchReports = useCallback(async () => {
    return await requestServer<AdminReportsResponse>('/admin/reports', { includeJwt: true });
  }, []);

  const {
    data,
    loading,
    error,
    trigger,
  } = useAsync(fetchReports, { immediate: true, notifyOnError: false });

  const organizationReports = data?.organizationReports ?? [];
  const volunteerReports = data?.volunteerReports ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        subtitle="Review organization and volunteer reports submitted by users."
        icon={Flag}
      />

      {error && (
        <Alert color="error" className="mb-6">
          <p>{error.message || 'Failed to load reports.'}</p>
          <div>
            <Button
              type="button"
              size="sm"
              style="outline"
              Icon={RotateCcw}
              onClick={() => { void trigger(); }}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card
          title="Organization Reports"
          description="Reports submitted by volunteers about organizations."
          Icon={Building2}
          right={(
            <span className="badge badge-accent">
              {organizationReports.length}
              {' '}
              Total
            </span>
          )}
        >
          {loading && !data
            ? (
                <div className="space-y-3">
                  <div className="h-20 w-full rounded-xl skeleton" />
                  <div className="h-20 w-full rounded-xl skeleton" />
                </div>
              )
            : organizationReports.length === 0
              ? (
                  <EmptyState
                    Icon={Inbox}
                    title="No organization reports"
                    description="No reports submitted by volunteers against organizations yet."
                  />
                )
              : (
                  <div className="space-y-3">
                    {organizationReports.map(report => (
                      <div key={report.id} className="rounded-xl border border-base-300 bg-base-100 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="badge badge-error badge-outline">{report.title}</span>
                          <span className="text-xs text-base-content/60">{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-base-content/80 whitespace-pre-wrap mb-3">{report.message}</p>
                        <div className="text-xs text-base-content/70 space-y-1">
                          <p>
                            <span className="font-semibold">Reported organization:</span>
                            {' '}
                            {`${report.reported_organization.name} (${report.reported_organization.email})`}
                          </p>
                          <p>
                            <span className="font-semibold">Reporter volunteer:</span>
                            {' '}
                            {`${report.reporter_volunteer.first_name} ${report.reporter_volunteer.last_name} (${report.reporter_volunteer.email})`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
        </Card>

        <Card
          title="Volunteer Reports"
          description="Reports submitted by organizations about volunteers."
          Icon={UserRound}
          right={(
            <span className="badge badge-accent">
              {volunteerReports.length}
              {' '}
              Total
            </span>
          )}
        >
          {loading && !data
            ? (
                <div className="space-y-3">
                  <div className="h-20 w-full rounded-xl skeleton" />
                  <div className="h-20 w-full rounded-xl skeleton" />
                </div>
              )
            : volunteerReports.length === 0
              ? (
                  <EmptyState
                    Icon={Inbox}
                    title="No volunteer reports"
                    description="No reports submitted by organizations against volunteers yet."
                  />
                )
              : (
                  <div className="space-y-3">
                    {volunteerReports.map(report => (
                      <div key={report.id} className="rounded-xl border border-base-300 bg-base-100 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="badge badge-error badge-outline">{report.title}</span>
                          <span className="text-xs text-base-content/60">{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-base-content/80 whitespace-pre-wrap mb-3">{report.message}</p>
                        <div className="text-xs text-base-content/70 space-y-1">
                          <p>
                            <span className="font-semibold">Reported volunteer:</span>
                            {' '}
                            {`${report.reported_volunteer.first_name} ${report.reported_volunteer.last_name} (${report.reported_volunteer.email})`}
                          </p>
                          <p>
                            <span className="font-semibold">Reporter organization:</span>
                            {' '}
                            {`${report.reporter_organization.name} (${report.reporter_organization.email})`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
        </Card>
      </div>
    </PageContainer>
  );
}

export default AdminReports;

import { AlertCircle, ArrowLeft, Check, Flag, RotateCcw, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import Loading from '../../components/Loading';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { AdminGetOrganizationReportResponse, AdminGetVolunteerReportResponse } from '../../../../server/src/api/types';

type ReportType = 'organization' | 'volunteer';

const formatReportTitle = (title: string) => title.replaceAll('_', ' ').replace(/^./, firstLetter => firstLetter.toUpperCase());

function AdminReportDetail() {
  const navigate = useNavigate();
  const { reportType, reportId } = useParams<{ reportType: ReportType; reportId: string }>();
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!reportType || !reportId || !['organization', 'volunteer'].includes(reportType)) {
      throw new Error('Invalid report type or ID.');
    }

    const endpoint = reportType === 'organization'
      ? `/admin/reports/organization/${reportId}`
      : `/admin/reports/volunteer/${reportId}`;

    return await requestServer<AdminGetOrganizationReportResponse | AdminGetVolunteerReportResponse>(endpoint, {
      includeJwt: true,
    });
  }, [reportType, reportId]);

  const {
    data: report,
    loading,
    error,
    trigger: refresh,
  } = useAsync(fetchReport, { immediate: true, notifyOnError: false });

  if (!reportType || !reportId || !['organization', 'volunteer'].includes(reportType)) {
    return (
      <PageContainer>
        <Alert color="error">
          <p>Invalid report type or ID.</p>
        </Alert>
      </PageContainer>
    );
  }

  const handleAcceptReport = async () => {
    if (!report || !reportId) return;

    try {
      setIsActionInProgress(true);
      setActionError(null);

      if (reportType === 'organization' && 'reported_organization' in report) {
        await requestServer(`/admin/reports/organization/${report.reported_organization.id}/disable`, {
          method: 'POST',
          includeJwt: true,
        });
      } else if (reportType === 'volunteer' && 'reported_volunteer' in report) {
        await requestServer(`/admin/reports/volunteer/${report.reported_volunteer.id}/disable`, {
          method: 'POST',
          includeJwt: true,
        });
      }

      await requestServer(`/admin/reports/${reportType}/${reportId}/reject`, {
        method: 'POST',
        includeJwt: true,
      });

      navigate('/admin/reports');
    } catch {
      setActionError('Failed to accept report. Please try again.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleRejectReport = async () => {
    if (!reportId) return;

    try {
      setIsActionInProgress(true);
      setActionError(null);

      await requestServer(`/admin/reports/${reportType}/${reportId}/reject`, {
        method: 'POST',
        includeJwt: true,
      });

      navigate('/admin/reports');
    } catch {
      setActionError('Failed to reject report. Please try again.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-12">
          <Loading />
        </div>
      </PageContainer>
    );
  }

  if (error || !report) {
    return (
      <PageContainer>
        <Alert color="error" className="mb-6">
          <p>{error?.message || 'Failed to load report.'}</p>
          <div>
            <Button
              type="button"
              size="sm"
              style="outline"
              Icon={RotateCcw}
              onClick={() => void refresh()}
            >
              Retry
            </Button>
          </div>
        </Alert>
      </PageContainer>
    );
  }

  const isOrganizationReport = reportType === 'organization' && 'reported_organization' in report;
  const isVolunteerReport = reportType === 'volunteer' && 'reported_volunteer' in report;

  return (
    <PageContainer>
      <div className="mb-6">
        <Button
          type="button"
          color="ghost"
          style="outline"
          Icon={ArrowLeft}
          onClick={() => navigate('/admin/reports')}
        >
          Back to Reports
        </Button>
      </div>

      <PageHeader
        title={reportType === 'organization' ? 'Organization Report' : 'Volunteer Report'}
        subtitle={`Reported on ${new Date(report.created_at).toLocaleString()}`}
        icon={Flag}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Report Details" description="Information about this report.">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="label m-0">
                  <span className="label-text font-semibold">Report Type</span>
                </label>
                <div className="badge badge-error badge-outline badge-lg">
                  {formatReportTitle(report.title)}
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-semibold">Message</span>
                </label>
                <div className="rounded-lg bg-base-100 border border-base-300 p-4 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm">
                  {report.message}
                </div>
              </div>

              {isOrganizationReport && (
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Reporter (Volunteer)</span>
                  </label>
                  <div className="rounded-lg bg-base-100 border border-base-300 p-4">
                    <p className="font-semibold">
                      {report.reporter_volunteer.first_name}
                      {' '}
                      {report.reporter_volunteer.last_name}
                    </p>
                    <p className="text-sm text-base-content/70">{report.reporter_volunteer.email}</p>
                  </div>
                </div>
              )}

              {isVolunteerReport && (
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Reporter (Organization)</span>
                  </label>
                  <div className="rounded-lg bg-base-100 border border-base-300 p-4">
                    <p className="font-semibold">{report.reporter_organization.name}</p>
                    <p className="text-sm text-base-content/70">{report.reporter_organization.email}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            title={isOrganizationReport ? 'Reported Organization' : 'Reported Volunteer'}
            description="Details of the reported account."
          >
            <div className="space-y-4">
              {isOrganizationReport && (
                <>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Organization Name</span>
                    </label>
                    <p className="text-lg">{report.reported_organization.name}</p>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Email</span>
                    </label>
                    <p className="text-sm">{report.reported_organization.email}</p>
                  </div>
                </>
              )}

              {isVolunteerReport && (
                <>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Volunteer Name</span>
                    </label>
                    <p className="text-lg">
                      {report.reported_volunteer.first_name}
                      {' '}
                      {report.reported_volunteer.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Email</span>
                    </label>
                    <p className="text-sm">{report.reported_volunteer.email}</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Actions" description="Choose how to handle this report." color="primary">
            <div className="space-y-3">
              {actionError && (
                <Alert color="error">
                  <p>{actionError}</p>
                </Alert>
              )}

              <button
                type="button"
                className="btn btn-success btn-block gap-2"
                onClick={() => void handleAcceptReport()}
                disabled={isActionInProgress}
              >
                {isActionInProgress
                  ? (
                      <>
                        <div className="loading loading-spinner loading-sm" />
                      </>
                    )
                  : (
                      <>
                        <Check size={18} />
                        Accept Report
                      </>
                    )}
              </button>

              <button
                type="button"
                className="btn btn-outline btn-block gap-2"
                onClick={() => void handleRejectReport()}
                disabled={isActionInProgress}
              >
                <X size={18} />
                Reject Report
              </button>

              <div className="alert alert-warning gap-2">
                <AlertCircle size={18} />
                <span className="text-xs">
                  Accepting this report will disable the reported account.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export default AdminReportDetail;

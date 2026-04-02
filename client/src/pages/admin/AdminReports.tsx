import { Building2, Flag, Inbox, RotateCcw, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { AdminReportsResponse } from '../../../../server/src/api/types';

type ReportsScope = 'all' | 'organization' | 'volunteer';
type ReportType = 'all' | 'scam' | 'impersonation' | 'harassment' | 'inappropriate_behavior' | 'other';
type ReportsSortBy = 'created_at' | 'title';
type ReportsSortDir = 'asc' | 'desc';

type ReportsFilters = {
  scope: ReportsScope;
  reportType: ReportType;
  search: string;
  startDate: string;
  endDate: string;
  sortBy: ReportsSortBy;
  sortDir: ReportsSortDir;
};

const defaultFilters: ReportsFilters = {
  scope: 'all',
  reportType: 'all',
  search: '',
  startDate: '',
  endDate: '',
  sortBy: 'created_at',
  sortDir: 'desc',
};

function AdminReports() {
  const [filters, setFilters] = useState<ReportsFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<ReportsFilters>(defaultFilters);

  const fetchReports = useCallback(async (nextFilters: ReportsFilters) => {
    const query: Record<string, string> = {
      scope: nextFilters.scope,
      sortBy: nextFilters.sortBy,
      sortDir: nextFilters.sortDir,
    };

    if (nextFilters.reportType !== 'all') {
      query.reportType = nextFilters.reportType;
    }

    if (nextFilters.search.trim()) {
      query.search = nextFilters.search.trim();
    }

    if (nextFilters.startDate) {
      query.startDate = nextFilters.startDate;
    }

    if (nextFilters.endDate) {
      query.endDate = nextFilters.endDate;
    }

    return await requestServer<AdminReportsResponse>('/admin/reports', {
      includeJwt: true,
      query,
    });
  }, []);

  const {
    data,
    loading,
    error,
    trigger,
  } = useAsync(fetchReports, { immediate: false, notifyOnError: false });

  const hasPendingChanges = useMemo(() => JSON.stringify(filters) !== JSON.stringify(activeFilters), [filters, activeFilters]);
  const hasAnyChangesFromDefault = useMemo(() => (
    JSON.stringify(filters) !== JSON.stringify(defaultFilters)
    || JSON.stringify(activeFilters) !== JSON.stringify(defaultFilters)
  ), [filters, activeFilters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveFilters(filters);
    void trigger(filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    void trigger(defaultFilters);
  };

  const refreshCurrentReports = () => {
    void trigger(activeFilters);
  };

  useEffect(() => {
    if (!data && !loading && !error) {
      void trigger(activeFilters);
    }
  }, [activeFilters, data, error, loading, trigger]);

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
              onClick={refreshCurrentReports}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      <Card title="Filters" description="Filter and sort reports before review." className="mb-6">
        <form className="space-y-4" onSubmit={applyFilters}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="label" htmlFor="reports-scope">
                <span className="label-text">Scope</span>
              </label>
              <select
                id="reports-scope"
                className="select select-bordered w-full"
                value={filters.scope}
                onChange={event => setFilters(prev => ({ ...prev, scope: event.target.value as ReportsScope }))}
              >
                <option value="all">All reports</option>
                <option value="organization">Organization reports</option>
                <option value="volunteer">Volunteer reports</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="reports-type">
                <span className="label-text">Report Type</span>
              </label>
              <select
                id="reports-type"
                className="select select-bordered w-full"
                value={filters.reportType}
                onChange={event => setFilters(prev => ({ ...prev, reportType: event.target.value as ReportType }))}
              >
                <option value="all">All types</option>
                <option value="scam">Scam</option>
                <option value="impersonation">Impersonation</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate_behavior">Inappropriate behavior</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="reports-search">
                <span className="label-text">Search</span>
              </label>
              <input
                id="reports-search"
                type="text"
                className="input input-bordered w-full"
                placeholder="Search title, message, names, emails"
                value={filters.search}
                onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="reports-start-date">
                <span className="label-text">Start Date</span>
              </label>
              <input
                id="reports-start-date"
                type="date"
                className="input input-bordered w-full"
                value={filters.startDate}
                onChange={event => setFilters(prev => ({ ...prev, startDate: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="reports-end-date">
                <span className="label-text">End Date</span>
              </label>
              <input
                id="reports-end-date"
                type="date"
                className="input input-bordered w-full"
                value={filters.endDate}
                onChange={event => setFilters(prev => ({ ...prev, endDate: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="reports-sort">
                <span className="label-text">Sort</span>
              </label>
              <select
                id="reports-sort"
                className="select select-bordered w-full"
                value={`${filters.sortBy}_${filters.sortDir}`}
                onChange={(event) => {
                  const [sortBy, sortDir] = event.target.value.split('_') as [ReportsSortBy, ReportsSortDir];
                  setFilters(prev => ({ ...prev, sortBy, sortDir }));
                }}
              >
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              color="ghost"
              Icon={RotateCcw}
              onClick={resetFilters}
              disabled={!hasAnyChangesFromDefault}
            >
              Reset
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={!hasPendingChanges}
            >
              Apply Filters
            </Button>
          </div>
        </form>
      </Card>

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

import { ClipboardCheck, Inbox, RotateCcw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import Button from '../../components/Button';
import PageHeader from '../../components/layout/PageHeader';
import OrganizationRequestReviewCard from '../../components/OrganizationRequestReviewCard';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { AdminOrganizationRequestsResponse } from '../../../../server/src/api/types';

type OrganizationRequestSortBy = 'created_at' | 'name';
type OrganizationRequestSortDir = 'asc' | 'desc';

type OrganizationRequestFilters = {
  search: string;
  sortBy: OrganizationRequestSortBy;
  sortDir: OrganizationRequestSortDir;
};

type OrganizationRequestSortOptionValue
  = | 'created_at_desc'
    | 'created_at_asc'
    | 'name_asc'
    | 'name_desc';

type OrganizationRequestSortOption = {
  value: OrganizationRequestSortOptionValue;
  label: string;
  sortBy: OrganizationRequestSortBy;
  sortDir: OrganizationRequestSortDir;
};

const organizationRequestSortOptions: OrganizationRequestSortOption[] = [
  { value: 'created_at_desc', label: 'Newest requests', sortBy: 'created_at', sortDir: 'desc' },
  { value: 'created_at_asc', label: 'Oldest requests', sortBy: 'created_at', sortDir: 'asc' },
  { value: 'name_asc', label: 'Name (A-Z)', sortBy: 'name', sortDir: 'asc' },
  { value: 'name_desc', label: 'Name (Z-A)', sortBy: 'name', sortDir: 'desc' },
];

const defaultFilters: OrganizationRequestFilters = {
  search: '',
  sortBy: 'created_at',
  sortDir: 'desc',
};

function AdminRequests() {
  const [filters, setFilters] = useState<OrganizationRequestFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<OrganizationRequestFilters>(defaultFilters);

  const getOrganizationRequests = useCallback(async (nextFilters: OrganizationRequestFilters) => {
    const query: Record<string, string> = {
      sortBy: nextFilters.sortBy,
      sortDir: nextFilters.sortDir,
    };

    if (nextFilters.search.trim()) {
      query.search = nextFilters.search.trim();
    }

    const res = await requestServer<AdminOrganizationRequestsResponse>('/admin/getOrganizationRequests', {
      includeJwt: true,
      query,
    });
    return res.organizationRequests;
  }, []);

  const {
    data: organizationRequests,
    trigger: refreshOrganizationRequests,
  } = useAsync(getOrganizationRequests, { immediate: false });

  useEffect(() => {
    void refreshOrganizationRequests(activeFilters);
  }, [activeFilters, refreshOrganizationRequests]);

  const hasPendingChanges = useMemo(() => JSON.stringify(filters) !== JSON.stringify(activeFilters), [filters, activeFilters]);
  const hasAnyChangesFromDefault = useMemo(() => (
    JSON.stringify(filters) !== JSON.stringify(defaultFilters)
    || JSON.stringify(activeFilters) !== JSON.stringify(defaultFilters)
  ), [filters, activeFilters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveFilters(filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
  };

  const refreshCurrentRequests = useCallback(
    async () => refreshOrganizationRequests(activeFilters),
    [activeFilters, refreshOrganizationRequests],
  );

  const selectedSortOption = organizationRequestSortOptions.find(option => option.sortBy === filters.sortBy && option.sortDir === filters.sortDir)
    ?? organizationRequestSortOptions[0];

  const onSortChange = (value: OrganizationRequestSortOptionValue) => {
    const nextOption = organizationRequestSortOptions.find(option => option.value === value);
    if (!nextOption) return;

    setFilters(prev => ({
      ...prev,
      sortBy: nextOption.sortBy,
      sortDir: nextOption.sortDir,
    }));
  };

  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto">
        <PageHeader
          title="Organization Requests"
          subtitle="Review pending onboarding submissions from organizations."
          icon={ClipboardCheck}
          badge={
            organizationRequests
              ? (
                  <div className="badge badge-primary">
                    {organizationRequests.length}
                    {' '}
                    Pending
                  </div>
                )
              : (
                  <div className="w-22 h-6 skeleton" />
                )
          }
        />

        <div className="mb-6 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>

          <form className="space-y-4" onSubmit={applyFilters}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="lg:min-w-0 lg:flex-1">
                <label className="label" htmlFor="organization-requests-search">
                  <span className="label-text">Search</span>
                </label>
                <label className="input input-bordered flex w-full items-center gap-2">
                  <Search className="h-4 w-4 opacity-70" />
                  <input
                    id="organization-requests-search"
                    type="text"
                    className="w-full min-w-0"
                    placeholder="Search name, email, location"
                    value={filters.search}
                    onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                  />
                </label>
              </div>

              <div className="lg:w-64">
                <label className="label" htmlFor="organization-requests-sort">
                  <span className="label-text">Sort By</span>
                </label>
                <select
                  id="organization-requests-sort"
                  className="select select-bordered w-full"
                  value={selectedSortOption.value}
                  onChange={event => onSortChange(event.target.value as OrganizationRequestSortOptionValue)}
                >
                  {organizationRequestSortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="lg:w-40">
                <Button color="primary" type="submit" disabled={!hasPendingChanges} layout="block">Search</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" color="ghost" onClick={resetFilters} disabled={!hasAnyChangesFromDefault} Icon={RotateCcw}>Reset</Button>
            </div>
          </form>
        </div>

        {organizationRequests
          ? (organizationRequests.length > 0
              ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {organizationRequests.map(request => (
                      <OrganizationRequestReviewCard
                        request={request}
                        refreshOrganizationRequests={refreshCurrentRequests}
                        key={request.id}
                      />
                    ))}
                  </div>
                )
              : (
                  <div className="hero bg-base-200 rounded-box p-10">
                    <div className="hero-content text-center">
                      <div className="max-w-md flex flex-col items-center">
                        <Inbox size={64} className="opacity-20 mb-4" />
                        <p className="py-2 font-bold opacity-80">All caught up!</p>
                        <p className="pb-6 opacity-60">No organization requests found at this time.</p>
                      </div>
                    </div>
                  </div>
                )
            )
          : (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                <div className="card shadow-sm border border-base-200 skeleton h-169">
                </div>
                <div className="card shadow-sm border border-base-200 skeleton h-169">
                </div>
                <div className="card shadow-sm border border-base-200 skeleton h-169">
                </div>
              </div>
            )}
      </div>
    </div>
  );
}

export default AdminRequests;

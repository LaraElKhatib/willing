import { ClipboardList, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import Alert from '../../components/Alert';
import Button from '../../components/Button';
import PageHeader from '../../components/layout/PageHeader';
import LinkButton from '../../components/LinkButton';
import PostingCard from '../../components/PostingCard';
import {
  buildSharedPostingQuery,
  hasSharedAdvancedPostingFilters,
  organizationPostingSortOptions,
  type OrganizationPostingSortBy,
  type OrganizationPostingSortOptionValue,
  type PostingSortDir,
  type SharedPostingFilterFields,
} from '../../components/postings/postingFilterConfig';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type {
  OrganizationCrisesResponse,
  OrganizationPostingListResponse,
} from '../../../../server/src/api/types';

type OrganizationPostingFilters = SharedPostingFilterFields & {
  sortBy: OrganizationPostingSortBy;
  sortDir: PostingSortDir;
  isClosed: 'all' | 'open' | 'closed';
  postingType: 'all' | 'open' | 'review';
  crisisId: 'all' | `${number}`;
};

const defaultFilters: OrganizationPostingFilters = {
  search: '',
  sortBy: 'start_date',
  sortDir: 'asc',
  isClosed: 'all',
  postingType: 'all',
  crisisId: 'all',
  startDateFrom: '',
  endDateTo: '',
  startTimeFrom: '',
  endTimeTo: '',
};

function OrganizationHome() {
  const [filters, setFilters] = useState<OrganizationPostingFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<OrganizationPostingFilters>(defaultFilters);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const fetchOrganizationPostings = useCallback(
    async (nextFilters: OrganizationPostingFilters) => {
      const query = buildSharedPostingQuery(nextFilters);

      if (nextFilters.isClosed !== 'all') {
        query.is_closed = nextFilters.isClosed === 'closed' ? 'true' : 'false';
      }

      if (nextFilters.postingType !== 'all') {
        query.automatic_acceptance = nextFilters.postingType === 'open' ? 'true' : 'false';
      }

      if (nextFilters.crisisId !== 'all') {
        query.crisis_id = nextFilters.crisisId;
      }

      const response = await requestServer<OrganizationPostingListResponse>(
        '/organization/posting',
        {
          includeJwt: true,
          query,
        },
      );
      return response.postings;
    },
    [],
  );

  const {
    data: postings,
    loading,
    error,
    trigger: fetchPostings,
  } = useAsync(fetchOrganizationPostings, { immediate: false });

  const { data: crises } = useAsync(
    async () => {
      const response = await requestServer<OrganizationCrisesResponse>('/organization/crises', {
        includeJwt: true,
      });
      return response.crises;
    },
    { immediate: true },
  );

  useEffect(() => {
    void fetchPostings(activeFilters);
  }, [activeFilters, fetchPostings]);

  const hasPendingChanges = useMemo(() => JSON.stringify(filters) !== JSON.stringify(activeFilters), [filters, activeFilters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveFilters(filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setShowAdvancedSearch(false);
  };

  const hasAdvancedFiltersApplied = hasSharedAdvancedPostingFilters(filters)
    || filters.isClosed !== 'all'
    || filters.postingType !== 'all'
    || filters.crisisId !== 'all';

  const selectedSortOption = organizationPostingSortOptions.find(option => option.sortBy === filters.sortBy && option.sortDir === filters.sortDir)
    ?? organizationPostingSortOptions[0];

  const onSortChange = (value: OrganizationPostingSortOptionValue) => {
    const nextOption = organizationPostingSortOptions.find(option => option.value === value);
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
          title="My Postings"
          icon={ClipboardList}
          badge={
            postings && (
              <div className="badge badge-primary">
                {postings.length}
                {' '}
                {postings.length === 1 ? 'Posting' : 'Postings'}
              </div>
            )
          }
          actions={(
            <LinkButton
              color="primary"
              to="/organization/posting"
              Icon={Plus}
            >
              Create New Posting
            </LinkButton>
          )}
        />

        <div className="mb-6 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
          <form className="space-y-4" onSubmit={applyFilters}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              <label className="input input-bordered flex items-center gap-2 lg:col-span-2">
                <Search className="h-4 w-4 opacity-70" />
                <input
                  type="text"
                  className="grow"
                  placeholder="Search title, description, location"
                  value={filters.search}
                  onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
                />
              </label>

              <select
                className="select select-bordered w-full"
                value={selectedSortOption.value}
                onChange={event => onSortChange(event.target.value as OrganizationPostingSortOptionValue)}
              >
                {organizationPostingSortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <Button color="primary" type="submit" disabled={!hasPendingChanges}>
                Search
              </Button>

              <Button
                type="button"
                color={hasAdvancedFiltersApplied || showAdvancedSearch ? 'secondary' : 'ghost'}
                onClick={() => setShowAdvancedSearch(prev => !prev)}
                Icon={SlidersHorizontal}
              >
                Advanced Search
              </Button>
            </div>

            {showAdvancedSearch && (
              <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">Advanced Search</h4>
                    <p className="text-sm opacity-70">Use these extra filters only when you need to narrow the list further.</p>
                  </div>
                  <Button type="button" color="ghost" onClick={resetFilters} disabled={!hasPendingChanges} Icon={RotateCcw}>
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <select
                    className="select select-bordered w-full"
                    value={filters.isClosed}
                    onChange={event => setFilters(prev => ({
                      ...prev,
                      isClosed: event.target.value as OrganizationPostingFilters['isClosed'],
                    }))}
                  >
                    <option value="all">Status: All</option>
                    <option value="open">Status: Open</option>
                    <option value="closed">Status: Closed</option>
                  </select>

                  <select
                    className="select select-bordered w-full"
                    value={filters.postingType}
                    onChange={event => setFilters(prev => ({
                      ...prev,
                      postingType: event.target.value as OrganizationPostingFilters['postingType'],
                    }))}
                  >
                    <option value="all">Posting Type: All</option>
                    <option value="open">Posting Type: Open Posting</option>
                    <option value="review">Posting Type: Review-Based</option>
                  </select>

                  <select
                    className="select select-bordered w-full"
                    value={filters.crisisId}
                    onChange={event => setFilters(prev => ({
                      ...prev,
                      crisisId: event.target.value as OrganizationPostingFilters['crisisId'],
                    }))}
                  >
                    <option value="all">Crisis: All</option>
                    {crises?.map(crisis => (
                      <option key={crisis.id} value={String(crisis.id)}>{crisis.name}</option>
                    ))}
                  </select>

                  <label className="form-control">
                    <span className="label-text mb-1">Start After (Inclusive)</span>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={filters.startDateFrom}
                      onChange={event => setFilters(prev => ({ ...prev, startDateFrom: event.target.value }))}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">End Before (Inclusive)</span>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={filters.endDateTo}
                      onChange={event => setFilters(prev => ({ ...prev, endDateTo: event.target.value }))}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">Start Time After</span>
                    <input
                      type="time"
                      className="input input-bordered w-full"
                      value={filters.startTimeFrom}
                      onChange={event => setFilters(prev => ({ ...prev, startTimeFrom: event.target.value }))}
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-1">End Time By</span>
                    <input
                      type="time"
                      className="input input-bordered w-full"
                      value={filters.endTimeTo}
                      onChange={event => setFilters(prev => ({ ...prev, endTimeTo: event.target.value }))}
                    />
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>

        {error && <div className="mb-4 text-sm text-base-content/70">Unable to load postings.</div>}

        {loading && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {!loading && (!postings || postings.length === 0) && (
          <Alert>
            No postings yet. Create your first posting to get started!
          </Alert>
        )}

        {!loading && postings && postings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postings.map(posting => (
              <PostingCard
                key={posting.id}
                posting={posting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizationHome;

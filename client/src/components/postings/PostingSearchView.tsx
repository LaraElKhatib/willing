import { RotateCcw, Search, SlidersHorizontal, TextSearch, type LucideIcon } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import requestServer from '../../utils/requestServer.ts';
import useAsync from '../../utils/useAsync';
import Alert from '../Alert.tsx';
import Button from '../Button.tsx';
import PageHeader from '../layout/PageHeader.tsx';
import Loading from '../Loading.tsx';
import PostingCard from '../PostingCard.tsx';
import {
  buildSharedPostingQuery,
  hasSharedAdvancedPostingFilters,
  volunteerPostingSortOptions,
  type PostingSortDir,
  type SharedPostingFilterFields,
  type VolunteerPostingSortBy,
  type VolunteerPostingSortOptionValue,
} from './postingFilterConfig.ts';

import type { VolunteerPostingSearchResponse } from '../../../../server/src/api/types.ts';
import type { PostingWithContext } from '../../../../server/src/types.ts';

export type PostingSearchFilters = SharedPostingFilterFields & {
  sortBy: VolunteerPostingSortBy;
  sortDir: PostingSortDir;
  startDateFrom: string;
  endDateTo: string;
  startTimeFrom: string;
  endTimeTo: string;
  hideFull: boolean;
};

type PostingSearchViewProps = {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  showBack?: boolean;
  defaultBackTo?: string;
  initialFilters?: Partial<PostingSearchFilters>;
  emptyMessage?: string;
  filterPostings?: (postings: PostingWithContext[]) => PostingWithContext[];
  fetchUrl?: string;
};

function PostingSearchView({
  title,
  subtitle,
  icon = TextSearch,
  badge,
  showBack = false,
  defaultBackTo,
  initialFilters,
  emptyMessage = 'No postings found yet',
  filterPostings,
  fetchUrl,
}: PostingSearchViewProps) {
  const defaultFilters = useMemo<PostingSearchFilters>(() => ({
    search: '',
    sortBy: 'recommended',
    sortDir: 'desc',
    startDateFrom: '',
    endDateTo: '',
    startTimeFrom: '',
    endTimeTo: '',
    hideFull: false,
    ...initialFilters,
  }), [initialFilters]);

  const [postings, setPostings] = useState<PostingWithContext[]>([]);
  const [filters, setFilters] = useState<PostingSearchFilters>(defaultFilters);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { trigger: fetchPostingsRequest } = useAsync(
    async (url: string) => requestServer<VolunteerPostingSearchResponse>(url, { includeJwt: true }),
    { notifyOnError: true },
  );

  const fetchPostings = useCallback(async (activeFilters: PostingSearchFilters) => {
    const baseUrl = fetchUrl ?? '/volunteer/posting';
    const query = new URLSearchParams(buildSharedPostingQuery(activeFilters));
    if (activeFilters.hideFull) query.append('hide_full', 'true');

    const url = query.size > 0 ? `${baseUrl}?${query.toString()}` : baseUrl;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchPostingsRequest(url);
      const postProcessFilteredPostings = filterPostings ? filterPostings(response.postings) : response.postings;
      const finalPostings = activeFilters.hideFull
        ? postProcessFilteredPostings.filter((posting) => {
            if (posting.max_volunteers === undefined || posting.max_volunteers === null) return true;
            return (posting.enrollment_count ?? 0) < posting.max_volunteers;
          })
        : postProcessFilteredPostings;

      setPostings(finalPostings);
    } catch (fetchError) {
      setPostings([]);
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load postings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchPostingsRequest, fetchUrl, filterPostings]);

  useEffect(() => {
    void fetchPostings(defaultFilters);
  }, [defaultFilters]);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setShowAdvancedSearch(false);
    void fetchPostings(defaultFilters);
  };

  const hasActiveFilters = useMemo(() => JSON.stringify(filters) !== JSON.stringify(defaultFilters), [filters, defaultFilters]);

  const hasAdvancedFiltersApplied = hasSharedAdvancedPostingFilters(filters) || filters.hideFull;

  const selectedSortOption = volunteerPostingSortOptions.find(option => option.sortBy === filters.sortBy && option.sortDir === filters.sortDir)
    ?? volunteerPostingSortOptions[0];

  const onSortChange = (value: VolunteerPostingSortOptionValue) => {
    const nextOption = volunteerPostingSortOptions.find(option => option.value === value);
    if (!nextOption) return;

    setFilters(prev => ({
      ...prev,
      sortBy: nextOption.sortBy,
      sortDir: nextOption.sortDir,
    }));
  };

  return (
    <div className="p-6 md:container mx-auto">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        badge={badge}
        showBack={showBack}
        defaultBackTo={defaultBackTo}
      />

      <div className="mb-6 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <h4 className="mb-3 text-lg font-semibold">Filter</h4>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void fetchPostings(filters);
          }}
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <label className="input input-bordered flex w-full items-center gap-2 lg:col-span-2">
              <Search className="h-4 w-4 opacity-70" />
              <input
                type="text"
                className="grow"
                placeholder="Search title, description, location, organization, skills"
                value={filters.search}
                onChange={event => setFilters({ ...filters, search: event.target.value })}
              />
            </label>

            <select
              className="select select-bordered w-full"
              value={selectedSortOption.value}
              onChange={event => onSortChange(event.target.value as VolunteerPostingSortOptionValue)}
            >
              {volunteerPostingSortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <Button
              color="primary"
              type="submit"
              disabled={!hasActiveFilters}
              Icon={Search}
            >
              Search
            </Button>
          </div>

          <div className="mt-3 flex gap-3">
            <Button
              type="button"
              color={hasAdvancedFiltersApplied || showAdvancedSearch ? 'secondary' : 'ghost'}
              onClick={() => setShowAdvancedSearch(prev => !prev)}
              Icon={SlidersHorizontal}
            >
              Advanced Search
            </Button>

            <Button
              type="button"
              color="ghost"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              Icon={RotateCcw}
            >
              Reset
            </Button>
          </div>

          {showAdvancedSearch && (
            <div className="mt-4 rounded-box border border-base-300 bg-base-200/40 p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
                  <span className="label-text mb-1">End By (Inclusive)</span>
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

              <label className="label mt-2 cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={filters.hideFull}
                  onChange={event => setFilters(prev => ({ ...prev, hideFull: event.target.checked }))}
                />
                <span className="label-text">Hide full postings</span>
              </label>
            </div>
          )}
        </form>
      </div>

      {error && <div className="mb-4 text-sm text-base-content/70">Unable to load postings.</div>}

      {loading
        ? (
            <div className="flex justify-center py-10">
              <Loading size="lg" />
            </div>
          )
        : postings.length === 0
          ? (
              <Alert>
                {emptyMessage}
              </Alert>
            )
          : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                {postings.map(posting => (
                  <PostingCard
                    key={posting.id}
                    posting={posting}
                  />
                ))}
              </div>
            )}
    </div>
  );
}

export default PostingSearchView;

import { TextSearch, type LucideIcon } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import {
  buildSharedPostingQuery,
  hasSharedAdvancedPostingFilters,
  resolveVolunteerPostingSortOption,
  toVolunteerPostingSortOptionValue,
  volunteerPostingSortOptions,
  type PostingSortDir,
  type SharedPostingFilterFields,
  type VolunteerPostingSortBy,
  type VolunteerPostingSortOptionValue,
} from './postingFilterConfig.ts';
import { FormField } from '../../utils/formUtils.tsx';
import requestServer from '../../utils/requestServer.ts';
import useAsync from '../../utils/useAsync';
import Alert from '../Alert.tsx';
import PageHeader from '../layout/PageHeader.tsx';
import Loading from '../Loading.tsx';
import PostingCard from '../PostingCard.tsx';
import PostingFiltersCard from './PostingFiltersCard.tsx';

import type { VolunteerPostingSearchResponse, VolunteerEnrollmentsResponse } from '../../../../server/src/api/types.ts';
import type { PostingWithContext } from '../../../../server/src/types.ts';

export type PostingSearchFilters = SharedPostingFilterFields & {
  sortBy: VolunteerPostingSortBy;
  sortDir: PostingSortDir;
  startDateFrom: string;
  endDateTo: string;
  startTimeFrom: string;
  endTimeTo: string;
  hideFull: boolean;
  crisisId: 'all' | `${number}`;
};

type PostingCrisisOption = {
  id: number;
  name: string;
};

type PostingSearchFormValues = Omit<PostingSearchFilters, 'sortBy' | 'sortDir'> & {
  sortOption: VolunteerPostingSortOptionValue;
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
  enableCrisisFilter?: boolean;
  crisisOptions?: PostingCrisisOption[];
};

const toPostingSearchFormValues = (filters: PostingSearchFilters): PostingSearchFormValues => ({
  search: filters.search,
  sortOption: toVolunteerPostingSortOptionValue(filters.sortBy, filters.sortDir),
  startDateFrom: filters.startDateFrom,
  endDateTo: filters.endDateTo,
  startTimeFrom: filters.startTimeFrom,
  endTimeTo: filters.endTimeTo,
  hideFull: filters.hideFull,
  crisisId: filters.crisisId,
});

const fromPostingSearchFormValues = (values: PostingSearchFormValues): PostingSearchFilters => {
  const selectedSortOption = resolveVolunteerPostingSortOption(values.sortOption);

  return {
    search: values.search,
    sortBy: selectedSortOption.sortBy,
    sortDir: selectedSortOption.sortDir,
    startDateFrom: values.startDateFrom,
    endDateTo: values.endDateTo,
    startTimeFrom: values.startTimeFrom,
    endTimeTo: values.endTimeTo,
    hideFull: values.hideFull,
    crisisId: values.crisisId,
  };
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
  enableCrisisFilter = false,
  crisisOptions = [],
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
    crisisId: 'all',
    ...initialFilters,
  }), [initialFilters]);
  const defaultFormValues = useMemo(() => toPostingSearchFormValues(defaultFilters), [defaultFilters]);

  const [postings, setPostings] = useState<PostingWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { trigger: fetchPostingsRequest } = useAsync(
    async (url: string) => requestServer<VolunteerPostingSearchResponse | VolunteerEnrollmentsResponse>(url, { includeJwt: true }),
    { notifyOnError: true },
  );

  const fetchPostings = useCallback(async (activeFilters: PostingSearchFilters) => {
    const baseUrl = fetchUrl ?? '/volunteer/posting';
    const query = new URLSearchParams(buildSharedPostingQuery(activeFilters));
    if (activeFilters.hideFull) query.append('hide_full', 'true');
    if (activeFilters.crisisId !== 'all') query.append('crisis_id', activeFilters.crisisId);

    const url = query.size > 0 ? `${baseUrl}?${query.toString()}` : baseUrl;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchPostingsRequest(url);
      const postProcessFilteredPostings = filterPostings ? filterPostings(response.postings) : response.postings;
      setPostings(postProcessFilteredPostings);
    } catch (fetchError) {
      setPostings([]);
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load postings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchPostingsRequest, fetchUrl, filterPostings]);

  const applyFilters = useCallback(async (formValues: PostingSearchFormValues) => {
    await fetchPostings(fromPostingSearchFormValues(formValues));
  }, [fetchPostings]);

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

      <PostingFiltersCard
        defaultValues={defaultFormValues}
        onApply={applyFilters}
        searchFieldName="search"
        searchPlaceholder="Search title, description, location, organization, or skills"
        sortFieldName="sortOption"
        sortOptions={volunteerPostingSortOptions.map(option => ({
          label: option.label,
          value: option.value,
        }))}
        getHasAdvancedFiltersApplied={values => hasSharedAdvancedPostingFilters(values) || values.hideFull || values.crisisId !== 'all'}
        renderAdvancedFields={form => (
          <>
            <FormField
              form={form}
              name="startDateFrom"
              label="Start After (Inclusive)"
              type="date"
            />

            <FormField
              form={form}
              name="endDateTo"
              label="End By (Inclusive)"
              type="date"
            />

            <FormField
              form={form}
              name="startTimeFrom"
              label="Start Time After"
              type="time"
            />

            <FormField
              form={form}
              name="endTimeTo"
              label="End Time By"
              type="time"
            />

            {enableCrisisFilter && (
              <div className="lg:col-span-2">
                <FormField
                  form={form}
                  name="crisisId"
                  label="Crisis"
                  selectOptions={[
                    { label: 'All Postings', value: 'all' },
                    ...crisisOptions.map(crisis => ({
                      label: crisis.name,
                      value: String(crisis.id),
                    })),
                  ]}
                />
              </div>
            )}

            <div className="lg:col-span-2 flex items-end">
              <label className="label cursor-pointer justify-start gap-3 py-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  {...form.register('hideFull')}
                />
                <span className="label-text">Hide full postings</span>
              </label>
            </div>
          </>
        )}
      />

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

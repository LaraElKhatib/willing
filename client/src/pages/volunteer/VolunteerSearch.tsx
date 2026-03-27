import { useMemo } from 'react';

import Loading from '../../components/Loading.tsx';
import PostingSearchView from '../../components/postings/PostingSearchView.tsx';
import PostingViewModeToggle from '../../components/postings/PostingViewModeToggle.tsx';
import requestServer from '../../utils/requestServer.ts';
import useAsync from '../../utils/useAsync.ts';

import type {
  VolunteerEnrollmentsResponse,
  VolunteerPinnedCrisesResponse,
} from '../../../../server/src/api/types.ts';
import type { PostingWithContext } from '../../../../server/src/types.ts';

function VolunteerSearch() {
  const { data: pinnedCrises } = useAsync(
    async () => {
      const response = await requestServer<VolunteerPinnedCrisesResponse>('/volunteer/crises/pinned', {
        includeJwt: true,
      });
      return response.crises;
    },
    { immediate: true },
  );

  const {
    data: enrollments,
    loading: enrollmentsLoading,
  } = useAsync(
    async () => {
      const response = await requestServer<VolunteerEnrollmentsResponse>('/volunteer/posting/enrollments', {
        includeJwt: true,
      });
      return response.postings;
    },
    { immediate: true },
  );

  const enrolledPostingIds = useMemo(
    () => new Set((enrollments ?? []).map(posting => posting.id)),
    [enrollments],
  );

  const filterPostings = useMemo(
    () => (postings: PostingWithContext[]) => postings.filter(posting => !enrolledPostingIds.has(posting.id)),
    [enrolledPostingIds],
  );

  if (enrollmentsLoading) {
    return (
      <div className="grow bg-base-200">
        <div className="flex justify-center py-10">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <PostingSearchView
      title="Search Opportunities"
      subtitle="Browse all postings and filter them down by dates, location, or skills."
      actions={<PostingViewModeToggle />}
      enableCrisisFilter
      filterPostings={filterPostings}
      crisisOptions={pinnedCrises?.map(crisis => ({
        id: crisis.id,
        name: crisis.name,
      })) ?? []}
    />
  );
}

export default VolunteerSearch;

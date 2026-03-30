import { Heart } from 'lucide-react';
import { useMemo } from 'react';

import PostingSearchView from '../../components/postings/PostingSearchView.tsx';
import requestServer from '../../utils/requestServer.ts';
import useAsync from '../../utils/useAsync.ts';

import type {
  VolunteerEnrollmentsResponse,
  VolunteerPinnedCrisesResponse,
} from '../../../../server/src/api/types.ts';
import type { PostingWithContext } from '../../../../server/src/types.ts';

function VolunteerForYou() {
  const { data: enrollments } = useAsync(
    async () => {
      const response = await requestServer<VolunteerEnrollmentsResponse>('/volunteer/posting/enrollments', {
        includeJwt: true,
      });
      return response.postings;
    },
    { immediate: true },
  );

  const { data: pinnedCrises } = useAsync(
    async () => {
      const response = await requestServer<VolunteerPinnedCrisesResponse>('/volunteer/crises/pinned', {
        includeJwt: true,
      });
      return response.crises;
    },
    { immediate: true },
  );

  const enrolledPostingIds = useMemo(
    () => new Set((enrollments ?? []).map(posting => posting.id)),
    [enrollments],
  );

  const pinnedCrisisIds = useMemo(
    () => new Set((pinnedCrises ?? []).map(crisis => crisis.id)),
    [pinnedCrises],
  );

  const filterPostings = useMemo(
    () => (postings: PostingWithContext[]) => postings
      .filter(posting => !enrolledPostingIds.has(posting.id))
      .filter(posting => posting.crisis_id == null || !pinnedCrisisIds.has(posting.crisis_id)),
    [enrolledPostingIds, pinnedCrisisIds],
  );

  return (
    <div className="grow bg-base-200">
      <PostingSearchView
        title="For You"
        subtitle="Personalized recommendations based on your activity and crisis priorities."
        icon={Heart}
        showBack
        defaultBackTo="/volunteer"
        fetchUrl="/volunteer/posting"
        filterPostings={filterPostings}
        enableCrisisFilter
        showEntityTabs={false}
        crisisOptions={(pinnedCrises ?? []).map(crisis => ({ id: crisis.id, name: crisis.name }))}
        emptyMessage="No recommended postings found yet."
      />
    </div>
  );
}

export default VolunteerForYou;

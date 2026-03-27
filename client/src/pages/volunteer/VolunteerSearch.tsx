import PostingSearchView from '../../components/postings/PostingSearchView.tsx';
import PostingViewModeToggle from '../../components/postings/PostingViewModeToggle.tsx';
import requestServer from '../../utils/requestServer.ts';
import useAsync from '../../utils/useAsync.ts';

import type { VolunteerPinnedCrisesResponse } from '../../../../server/src/api/types.ts';

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

  return (
    <div className="grow bg-base-200">
      <PostingSearchView
        title="Search Opportunities"
        subtitle="Browse all postings and filter them down by dates, location, or skills."
        icon={undefined}
        showBack={false}
        actions={<PostingViewModeToggle />}
        fetchUrl="/volunteer/posting?include_applied=true"
        enableCrisisFilter
        crisisOptions={pinnedCrises?.map(crisis => ({
          id: crisis.id,
          name: crisis.name,
        })) ?? []}
      />
    </div>
  );
}

export default VolunteerSearch;

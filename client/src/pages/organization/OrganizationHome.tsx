import { ClipboardList, Plus } from 'lucide-react';
import { useMemo } from 'react';

import Alert from '../../components/Alert';
import PageHeader from '../../components/layout/PageHeader';
import LinkButton from '../../components/LinkButton';
import PostingCollection from '../../components/postings/PostingCollection';
import PostingViewModeToggle from '../../components/postings/PostingViewModeToggle.tsx';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { OrganizationPostingListResponse } from '../../../../server/src/api/types';
import type { PostingWithContext } from '../../../../server/src/types';

function OrganizationHome() {
  const { data: postings, loading, error } = useAsync(
    async () => {
      const response = await requestServer<OrganizationPostingListResponse>(
        '/organization/posting',
        {
          includeJwt: true,
        },
      );
      return response.postings;
    },
    { immediate: true },
  );

  const postingsWithContext = useMemo<PostingWithContext[]>(() => {
    if (!postings) return [];

    return postings.map(posting => ({
      ...posting,
      organization_name: '',
      organization_logo_path: undefined,
      crisis_name: null,
      application_status: 'none',
    }));
  }, [postings]);

  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto">
        <PageHeader
          title="My Postings"
          subtitle="Track, manage, and update your organization opportunities."
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
            <div className="flex flex-wrap items-center gap-2">
              <PostingViewModeToggle />

              <LinkButton
                color="primary"
                to="/organization/posting"
                Icon={Plus}
              >
                Create New Posting
              </LinkButton>
            </div>
          )}
        />

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

        {!loading && postingsWithContext.length > 0 && (
          <PostingCollection
            postings={postingsWithContext}
            variant="organization"
            cardsContainerClassName="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            listContainerClassName="space-y-4"
          />
        )}
      </div>
    </div>
  );
}

export default OrganizationHome;

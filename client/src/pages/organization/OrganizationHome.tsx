import { ClipboardList, LayoutGrid, List, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import Alert from '../../components/Alert';
import PageHeader from '../../components/layout/PageHeader';
import LinkButton from '../../components/LinkButton';
import PostingCard from '../../components/PostingCard';
import PostingList from '../../components/PostingList';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { OrganizationPostingListResponse } from '../../../../server/src/api/types';
import type { PostingWithContext } from '../../../../server/src/types';

type PostingViewMode = 'cards' | 'list';
const POSTING_VIEW_MODE_STORAGE_KEY = 'posting-view-mode';

function OrganizationHome() {
  const [viewMode, setViewMode] = useState<PostingViewMode>(() => {
    if (typeof window === 'undefined') return 'cards';
    return window.localStorage.getItem(POSTING_VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'cards';
  });

  const onViewModeChange = (mode: PostingViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(POSTING_VIEW_MODE_STORAGE_KEY, mode);
    }
  };

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
              <div className="join">
                <button
                  type="button"
                  className={`join-item btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => onViewModeChange('cards')}
                  aria-pressed={viewMode === 'cards'}
                >
                  <LayoutGrid size={14} />
                  Cards
                </button>
                <button
                  type="button"
                  className={`join-item btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => onViewModeChange('list')}
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={14} />
                  List
                </button>
              </div>

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
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {postingsWithContext.map(posting => (
              viewMode === 'cards'
                ? (
                    <PostingCard
                      key={posting.id}
                      posting={posting}
                    />
                  )
                : (
                    <PostingList
                      key={posting.id}
                      posting={posting}
                      variant="organization"
                    />
                  )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizationHome;

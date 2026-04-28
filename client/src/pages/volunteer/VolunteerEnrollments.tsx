import { ClipboardList } from 'lucide-react';
import { useMemo } from 'react';

import PostingSearchView from '../../components/postings/PostingSearchView.tsx';
import { hasPostingEnded } from '../../components/postings/postingUtils';
import PostingViewModeToggle from '../../components/postings/PostingViewModeToggle.tsx';
import useNow from '../../components/postings/useNow';

import type { PostingWithContext } from '../../../../server/src/types';

function VolunteerEnrollments() {
  const now = useNow();

  const sortEnrollments = useMemo(() => (postings: PostingWithContext[]) => {
    return [...postings].sort((a, b) => {
      const aEnded = hasPostingEnded(a, now);
      const bEnded = hasPostingEnded(b, now);

      if (aEnded && !bEnded) return 1;
      if (!aEnded && bEnded) return -1;
      return 0;
    });
  }, [now]);

  return (
    <PostingSearchView
      title="My Enrollments"
      subtitle="Here you can view all postings you're currently enrolled in or have applied to."
      icon={ClipboardList}
      actions={<PostingViewModeToggle />}
      filterPostings={sortEnrollments}
      showBack
      defaultBackTo="/volunteer"
      fetchUrl="/volunteer/posting/enrollments"
      emptyMessage="You haven't applied to any postings yet."
      showEntityTabs={false}
    />
  );
}

export default VolunteerEnrollments;

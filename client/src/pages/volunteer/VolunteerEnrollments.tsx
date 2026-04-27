import { ClipboardList } from 'lucide-react';
import { useMemo } from 'react';

import PostingSearchView from '../../components/postings/PostingSearchView.tsx';
import PostingViewModeToggle from '../../components/postings/PostingViewModeToggle.tsx';

import type { PostingWithContext } from '../../../../server/src/types.ts';

type PostingWithEndDate = {
  end_date: string | Date;
  end_time: string;
};

const parsePostingEndDateTime = (posting: PostingWithEndDate): number => {
  const endDatePart = posting.end_date instanceof Date
    ? posting.end_date.toISOString().slice(0, 10)
    : posting.end_date.slice(0, 10);

  const normalizedTime = /^\d{2}:\d{2}(:\d{2})?$/.test(posting.end_time)
    ? posting.end_time.length === 5
      ? `${posting.end_time}:59`
      : posting.end_time
    : '23:59:59';

  return Date.parse(`${endDatePart}T${normalizedTime}`);
};

const isPostingEnded = (posting: PostingWithEndDate, now: number): boolean => {
  const endDateTime = parsePostingEndDateTime(posting);
  if (Number.isNaN(endDateTime)) {
    return false;
  }
  return endDateTime < now;
};

function VolunteerEnrollments() {
  const filterEnrollments = useMemo(
    () => (postings: PostingWithContext[]) => {
      const now = Date.now();
      return [...postings].sort(
        (a, b) => Number(isPostingEnded(a, now)) - Number(isPostingEnded(b, now)),
      );
    },
    [],
  );

  return (
    <PostingSearchView
      title="My Enrollments"
      subtitle="Here you can view all postings you're currently enrolled in or have applied to."
      icon={ClipboardList}
      actions={<PostingViewModeToggle />}
      showBack
      defaultBackTo="/volunteer"
      fetchUrl="/volunteer/posting/enrollments"
      filterPostings={filterEnrollments}
      emptyMessage="You haven't applied to any postings yet."
      showEntityTabs={false}
    />
  );
}

export default VolunteerEnrollments;

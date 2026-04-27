import { ClipboardList } from 'lucide-react';

import PostingSearchView from '../../components/postings/PostingSearchView.tsx';
import PostingViewModeToggle from '../../components/postings/PostingViewModeToggle.tsx';

function VolunteerEnrollments() {
  return (
    <PostingSearchView
      title="My Enrollments"
      subtitle="Here you can view all postings you're currently enrolled in or have applied to."
      icon={ClipboardList}
      actions={<PostingViewModeToggle />}
      showBack
      defaultBackTo="/volunteer"
      fetchUrl="/volunteer/posting/enrollments"
      emptyMessage="You haven't applied to any postings yet."
      showEntityTabs={false}
    />
  );
}

export default VolunteerEnrollments;

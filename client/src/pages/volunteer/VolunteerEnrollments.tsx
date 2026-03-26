import { ClipboardList } from 'lucide-react';

import PostingSearchView from '../../components/postings/PostingSearchView.tsx';

function VolunteerEnrollments() {
  return (
    <PostingSearchView
      title="My Enrollments"
      subtitle="Here you can view all postings you're currently enrolled in or have applied to."
      icon={ClipboardList}
      showBack
      defaultBackTo="/volunteer"
      fetchUrl="/volunteer/posting/enrollments"
      emptyMessage="You haven't applied to any postings yet."
    />
  );
}

export default VolunteerEnrollments;

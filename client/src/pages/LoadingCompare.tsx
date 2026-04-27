import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import LoadingList from '../components/LoadingList';
import PostingCard from '../components/PostingCard';
import PostingList from '../components/PostingList';

import type { PostingWithContext } from '../../../server/src/types';

const mockPosting: PostingWithContext = {
  id: 1,
  organization_id: 3,
  organization_name: 'Red Cross Lebanon',
  organization_logo_path: null,
  title: 'Beirut Cleanup Drive',
  description: 'Join us for a community cleanup event in Gemmayzeh.',
  start_date: '2026-05-01' as unknown as Date,
  end_date: '2026-05-02' as unknown as Date,
  start_time: '09:00',
  end_time: '17:00',
  location_name: 'Gemmayzeh Street',
  latitude: 33.8938,
  longitude: 35.5018,
  max_volunteers: 20,
  allows_partial_attendance: false,
  automatic_acceptance: true,
  is_closed: false,
  enrollment_count: 12,
  crisis_id: null,
  crisis_name: null,
  application_status: 'none',
  date_capacity: undefined,
  minimum_age: 4,
  updated_at: new Date(),
  created_at: new Date(),
  skills: [
    {
      id: 6,
      name: 'fasdfds',
      posting_id: 1,
    },
    {
      id: 8,
      name: 'kfjasdlkj',
      posting_id: 1,
    },
    {
      id: 7,
      name: 'vlksdfasljk',
      posting_id: 1,
    },
    {
      id: 5,
      name: 'fldksajl ',
      posting_id: 1,
    },
  ],
};

export default function LoadingComparePage() {
  return (
    <PageContainer>
      <PageHeader title="Loading Component Comparison" />

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-bold mb-4">Cards View</h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-primary mb-2">Loading:</p>
              <LoadingList count={1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-success mb-2">Actual:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <PostingCard posting={mockPosting} showCrisis={false} fillHeight />
              </div>
            </div>
          </div>
        </section>

        <hr className="my-8" />

        <section>
          <h2 className="text-xl font-bold mb-4">List View</h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-primary mb-2">Loading:</p>
              <LoadingList count={1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-success mb-2">Actual:</p>
              <PostingList posting={mockPosting} showCrisis={false} variant="volunteer" />
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

import { Building2, Flag, UserRound } from 'lucide-react';

import Card from '../../components/Card';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';

function AdminReports() {
  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        subtitle="Review organization and volunteer reports submitted by users."
        icon={Flag}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card
          title="Organization Reports"
          description="Reports submitted by volunteers about organizations."
          Icon={Building2}
        >
          <div className="rounded-xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
            Organization report list will be added here.
          </div>
        </Card>

        <Card
          title="Volunteer Reports"
          description="Reports submitted by organizations about volunteers."
          Icon={UserRound}
        >
          <div className="rounded-xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
            Volunteer report list will be added here.
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default AdminReports;

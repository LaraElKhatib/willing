import { Lock } from 'lucide-react';

import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import PasswordResetCard from '../../components/PasswordResetCard';

function VolunteerSettings() {
  return (
    <PageContainer>
      <PageHeader
        title="Change Password"
        subtitle="Update your credentials to maintain account security."
        icon={Lock}
      />

      <PasswordResetCard />
    </PageContainer>
  );
}

export default VolunteerSettings;

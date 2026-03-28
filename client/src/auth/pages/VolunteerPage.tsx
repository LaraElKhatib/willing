import { Outlet } from 'react-router';

import UserNavbar from '../../components/layout/navbars/UserNavbar';
import { VolunteerOnly } from '../guards';

function VolunteerPage() {
  return (
    <VolunteerOnly>
      <main className="h-screen flex flex-col">
        <UserNavbar />
        <div className="overflow-y-scroll">
          <Outlet />
        </div>
      </main>
    </VolunteerOnly>
  );
}

export default VolunteerPage;

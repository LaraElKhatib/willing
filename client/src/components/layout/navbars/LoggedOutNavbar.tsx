import { FileSearch, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

import Navbar from './Navbar';

function LoggedOutNavbar() {
  return (
    <Navbar
      right={(
        <div className="flex items-center gap-2">
          <Link to="/certificate/verify" className="btn btn-ghost">
            <FileSearch size={20} />
            Verify Certificate
          </Link>
          <Link to="/login" className="btn btn-ghost">
            <LogIn size={20} />
            Login
          </Link>
        </div>
      )}
    />
  );
}

export default LoggedOutNavbar;

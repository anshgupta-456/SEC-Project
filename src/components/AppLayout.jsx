import { useContext } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { userContext } from '../context/usercontext';

const PAGES = {
  student: {
    '/': { eyebrow: 'Your record', title: <>Your <em>grievances</em></>, sub: 'Everything you have raised, where it is routed, and what the committee has said.' },
    '/addGrievance': { eyebrow: 'New submission', title: <>Raise a <em>grievance</em></>, sub: 'Write it or say it in your own language. We will route it to the right committee.' },
    '/dashboard': { eyebrow: 'Overview', title: 'At a glance', sub: 'How your grievances are moving through the system.' },
    '/profile': { eyebrow: 'Account', title: 'Profile', sub: 'Your contact details, as committees see them.' },
    '/settings': { eyebrow: 'Account', title: 'Settings', sub: 'Password and preferences.' },
  },
  admin: {
    '/': { eyebrow: 'Committee desk', title: <>Incoming <em>grievances</em></>, sub: 'Review, update and respond. Students see your status and reply immediately.' },
    '/dashboard': { eyebrow: 'Reporting', title: 'Committee report', sub: 'Volume, categories and resolution performance.' },
    '/profile': { eyebrow: 'Account', title: 'Profile', sub: 'Your details and committee.' },
    '/settings': { eyebrow: 'Account', title: 'Settings', sub: 'Change your password.' },
  },
};

export default function AppLayout() {
  const { User, isAdmin, logout } = useContext(userContext);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const page = PAGES[isAdmin ? 'admin' : 'student'][pathname] || {};

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (User.full_name || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="wordmark" aria-label="Grievance Hub home">
          <span className="wordmark-mark">g</span>
          <span>
            <span className="wordmark-name">Grievance Hub</span>
            <span className="wordmark-sub">{isAdmin ? 'Committee desk' : 'Student portal'}</span>
          </span>
        </NavLink>

        <div className="nav-label">Workspace</div>
        <nav className="nav">
          <NavLink to="/" end><InboxOutlinedIcon />{isAdmin ? 'Grievances' : 'My grievances'}</NavLink>
          {!isAdmin && <NavLink to="/addGrievance"><AddIcon />New grievance</NavLink>}
          <NavLink to="/dashboard"><InsightsOutlinedIcon />{isAdmin ? 'Reports' : 'Overview'}</NavLink>
          <NavLink to="/profile"><PersonOutlineIcon />Profile</NavLink>
          <NavLink to="/settings"><TuneOutlinedIcon />Settings</NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="who">
            <div className="initials">{initials}</div>
            <div>
              <div className="who-name">{User.full_name}</div>
              <div className="who-sub">
                {isAdmin ? User.committee || 'All committees' : [User.student_id, User.department].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <button type="button" className="signout" onClick={signOut}>
            <LogoutOutlinedIcon fontSize="small" /> Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            {page.eyebrow && <p className="eyebrow">{page.eyebrow}</p>}
            <h1 className="page-title">{page.title}</h1>
            {page.sub && <p className="page-sub">{page.sub}</p>}
          </div>
          {!isAdmin && pathname === '/' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/addGrievance')}>
              New grievance
            </Button>
          )}
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

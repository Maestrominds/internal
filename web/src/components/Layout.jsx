import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/format';

const BossNav = () => (
  <>
    <NavLink to="/dashboard/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      Reports
    </NavLink>
    <NavLink to="/dashboard/managers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Managers
    </NavLink>
  </>
);

const ManagerNav = () => (
  <NavLink to="/dashboard/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
    My Reports
  </NavLink>
);

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>InternalApp</h1>
          <span>{user?.role === 'boss' ? 'Boss Dashboard' : 'Manager Portal'}</span>
        </div>
        <nav className="sidebar-nav">
          {user?.role === 'boss' ? <BossNav /> : <ManagerNav />}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip" style={{ marginBottom: '12px' }}>
            <div className="user-avatar">{getInitials(user?.name)}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role" style={{ textTransform: 'capitalize', color: 'rgba(255,255,255,.45)' }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost w-full"
            style={{ color: 'rgba(255,255,255,.55)', justifyContent: 'flex-start', fontSize: '0.83rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

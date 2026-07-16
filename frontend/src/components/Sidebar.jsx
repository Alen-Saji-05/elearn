import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

// Primary navigation lives in the rail; account/utility actions live in the top bar.
function buildNav(user) {
  const items = [
    { to: '/', label: 'Home', icon: 'home', end: true },
  ];
  // Mentors manage only their own courses (from the dashboard) — no "browse all courses".
  if (!user || user.role !== 'MENTOR') {
    items.push({ to: '/courses', label: 'Courses', icon: 'courses' });
  }
  if (user) {
    items.push({ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' });
    if (user.role === 'MENTOR') {
      items.push({ to: '/courses/create', label: 'Create', icon: 'create' });
      items.push({ to: '/mentor/chats', label: 'Q&A', icon: 'inbox' });
    }
    if (user.role === 'ADMIN') {
      items.push({ to: '/admin', label: 'Admin', icon: 'admin' });
    }
  }
  return items;
}

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const nav = buildNav(user);

  const handleLogout = () => {
    logout();
    onNavigate?.();
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Primary">
      <Link to="/" className="sidebar-brand" onClick={onNavigate} aria-label="LearnHub home">
        <span className="brand-mark"><Icon name="cap" size={24} strokeWidth={2} /></span>
        <span className="brand-wordmark">LearnHub</span>
      </Link>

      <nav className="sidebar-nav">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <button className="nav-item" onClick={handleLogout}>
            <Icon name="logout" />
            <span>Log out</span>
          </button>
        ) : (
          <NavLink to="/login" onClick={onNavigate} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon name="login" />
            <span>Sign in</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      api.get('/notifications/unread-count/')
        .then(res => setUnreadCount(res.data.unread_count))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openNotifications = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      try {
        const res = await api.get('/notifications/');
        setNotifications(res.data.results || res.data);
      } catch {}
    }
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all/');
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">🎓</span>
        LearnHub
      </Link>

      <ul className="navbar-links">
        <li><Link to="/courses">Courses</Link></li>

        {!user ? (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link></li>
          </>
        ) : (
          <>
            <li><Link to="/dashboard">Dashboard</Link></li>
            {user.role === 'MENTOR' && (
              <>
                <li><Link to="/mentor/chats">Q&A Inbox</Link></li>
                <li><Link to="/courses/create">Create Course</Link></li>
              </>
            )}
            {user.role === 'ADMIN' && (
              <li><Link to="/admin">Admin</Link></li>
            )}
            <li ref={dropdownRef} style={{ position: 'relative' }}>
              <span className="notification-bell" onClick={openNotifications}>
                🔔
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </span>
              {showNotifs && (
                <div className="notification-dropdown">
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--border)', marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No notifications
                    </p>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                        onClick={() => {
                          if (n.link) navigate(n.link);
                          setShowNotifs(false);
                        }}
                      >
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{timeAgo(n.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
            <li><Link to="/profile">Profile</Link></li>
            <li><button onClick={handleLogout}>Logout</button></li>
          </>
        )}
      </ul>
    </nav>
  );
}

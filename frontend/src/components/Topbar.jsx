import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import api from '../api/axios';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const initials = user
    ? (user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase()
    : '';

  return (
    <header className="shell-topbar">
      <button className="topbar-menu" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" size={20} />
      </button>
      <Link to="/" className="topbar-brand">
        <span className="brand-mark" style={{ width: 32, height: 32, borderRadius: 9 }}>
          <Icon name="cap" size={18} strokeWidth={2} />
        </span>
        LearnHub
      </Link>

      <div className="topbar-actions">
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="theme-toggle"
              onClick={openNotifications}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Icon name="bell" size={19} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {showNotifs && (
              <div className="notification-dropdown">
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    You're all caught up.
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
          </div>
        )}

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>

        {user ? (
          <Link to="/profile" className="avatar-chip" title="Your profile">
            <span className="avatar-dot">
              {user.avatar ? <img src={user.avatar} alt="" /> : initials}
            </span>
            <span className="avatar-name">{user.first_name || user.username}</span>
          </Link>
        ) : (
          <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
        )}
      </div>
    </header>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="dashboard-header">
        <h1>My Profile</h1>
        <p>Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div className="chat-avatar" style={{
          width: 80, height: 80, fontSize: '2rem', margin: '0 auto 1rem'
        }}>
          {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
        </div>
        <h2 style={{ marginBottom: '0.25rem' }}>
          {user?.first_name} {user?.last_name || user?.username}
        </h2>
        <span className={`badge ${user?.role === 'MENTOR' ? 'badge-yellow' : user?.role === 'ADMIN' ? 'badge-purple' : 'badge-green'}`}>
          {user?.role}
        </span>
        {user?.role === 'MENTOR' && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: user?.is_approved ? 'var(--success)' : 'var(--warning)' }}>
            {user?.is_approved ? 'Approved Mentor' : 'Pending Approval'}
          </p>
        )}
      </div>

      {message && (
        <div style={{
          padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
          background: message.includes('success') ? 'var(--success-light)' : 'var(--danger-light)',
          color: message.includes('success') ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              type="text"
              className="form-input"
              value={form.first_name}
              onChange={e => setForm({ ...form, first_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              type="text"
              className="form-input"
              value={form.last_name}
              onChange={e => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Bio</label>
          <textarea
            className="form-textarea"
            placeholder="Tell us about yourself..."
            value={form.bio}
            onChange={e => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone</label>
          <input
            type="text"
            className="form-input"
            placeholder="+1 (555) 000-0000"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

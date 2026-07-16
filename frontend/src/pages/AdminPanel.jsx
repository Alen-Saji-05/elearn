import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import api from '../api/axios';

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [reportedReviews, setReportedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usersRes, coursesRes] = await Promise.all([
          api.get('/users/'),
          api.get('/courses/'),
        ]);
        setUsers(usersRes.data.results || usersRes.data);
        setCourses(coursesRes.data.results || coursesRes.data);

        try {
          const reviewsRes = await api.get('/reviews/reported/');
          setReportedReviews(reviewsRes.data.results || reviewsRes.data);
        } catch {}
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  const approveMentor = async (userId) => {
    try {
      await api.post(`/users/${userId}/approve/`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
    } catch {}
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}/`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const saveUser = async (updated) => {
    try {
      const res = await api.patch(`/users/${updated.id}/`, {
        first_name: updated.first_name,
        last_name: updated.last_name,
        email: updated.email,
        role: updated.role,
        is_active: updated.is_active,
        is_approved: updated.is_approved,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...res.data } : u));
      setEditUser(null);
    } catch (err) {
      alert(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to update user.');
    }
  };

  const approveCourse = async (courseId) => {
    try {
      await api.post(`/courses/${courseId}/approve/`);
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: 'PUBLISHED' } : c));
    } catch {}
  };

  const rejectCourse = async (courseId) => {
    try {
      await api.post(`/courses/${courseId}/reject/`);
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: 'REJECTED' } : c));
    } catch {}
  };

  const moderateReview = async (reviewId, action) => {
    try {
      await api.post(`/reviews/${reviewId}/moderate/`, { action });
      setReportedReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch {}
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1>Admin Panel</h1>
        <p>Manage users, courses, and content</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'users', label: 'Users' },
          { id: 'courses', label: 'Courses' },
          { id: 'reviews', label: 'Reported Reviews' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${
                      u.role === 'ADMIN' ? 'badge-purple' :
                      u.role === 'MENTOR' ? 'badge-yellow' : 'badge-green'
                    }`}>{u.role}</span>
                  </td>
                  <td>
                    {!u.is_active ? (
                      <span className="status-badge rejected">Disabled</span>
                    ) : u.role === 'MENTOR' && !u.is_approved ? (
                      <span className="status-badge pending">Pending</span>
                    ) : (
                      <span className="status-badge active">Active</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {u.role === 'MENTOR' && !u.is_approved && (
                        <button className="btn btn-primary btn-sm" onClick={() => approveMentor(u.id)}>
                          Approve
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditUser(u)}>
                        <Icon name="edit" size={15} /> Edit
                      </button>
                      {u.id !== currentUser?.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>
                          <Icon name="trash" size={15} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Mentor</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.title}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.mentor?.username || '—'}</td>
                  <td>{c.price == 0 ? 'Free' : `$${c.price}`}</td>
                  <td>
                    <span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    {c.status === 'PENDING' && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => approveCourse(c.id)}>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => rejectCourse(c.id)}>
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reported Reviews Tab */}
      {activeTab === 'reviews' && (
        <div>
          {reportedReviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="check" size={44} /></div>
              <h3>No reported reviews</h3>
            </div>
          ) : (
            reportedReviews.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{r.student_name}</strong>
                  <span className="rating-display">{'★'.repeat(r.rating)}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{r.comment}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => moderateReview(r.id, 'approve')}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => moderateReview(r.id, 'reject')}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={saveUser}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ ...user });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Edit {user.username}</h2>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input className="form-input" value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="STUDENT">Student</option>
            <option value="MENTOR">Mentor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', margin: '0.5rem 0 1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} />
            Active
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={!!form.is_approved} onChange={e => set('is_approved', e.target.checked)} />
            Approved (mentor)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Save Changes</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

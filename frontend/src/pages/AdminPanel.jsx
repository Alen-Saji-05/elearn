import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reportedReviews, setReportedReviews] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <h1>🛡️ Admin Panel</h1>
        <p>Manage users, courses, and content</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'users', label: '👥 Users' },
          { id: 'courses', label: '📚 Courses' },
          { id: 'reviews', label: '⭐ Reported Reviews' },
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
                    {u.role === 'MENTOR' && !u.is_approved ? (
                      <span className="status-badge pending">Pending</span>
                    ) : (
                      <span className="status-badge active">Active</span>
                    )}
                  </td>
                  <td>
                    {u.role === 'MENTOR' && !u.is_approved && (
                      <button className="btn btn-primary btn-sm" onClick={() => approveMentor(u.id)}>
                        Approve
                      </button>
                    )}
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
              <div className="empty-icon">✅</div>
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
    </div>
  );
}

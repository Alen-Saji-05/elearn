import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CourseCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', short_description: '',
    price: '0', level: 'BEGINNER', language: 'English',
    tags: '', duration_hours: '0', status: 'DRAFT',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/courses/', {
        ...form,
        price: parseFloat(form.price),
        duration_hours: parseInt(form.duration_hours),
      });
      navigate(`/courses/${res.data.slug || res.data.id}`);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Failed to create course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="dashboard-header">
        <h1>Create New Course</h1>
        <p>Set up your course details, then add modules and lessons.</p>
      </div>

      {error && <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label className="form-label">Course Title *</label>
          <input
            id="course-title"
            type="text"
            className="form-input"
            placeholder="e.g. Complete Python Masterclass"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Short Description</label>
          <input
            type="text"
            className="form-input"
            placeholder="A brief summary (shown in course cards)"
            value={form.short_description}
            onChange={e => setForm({ ...form, short_description: e.target.value })}
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Full Description *</label>
          <textarea
            className="form-textarea"
            placeholder="Detailed course description..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            required
            style={{ minHeight: 150 }}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Level</label>
            <select className="form-select" value={form.level}
              onChange={e => setForm({ ...form, level: e.target.value })}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Language</label>
            <input
              type="text"
              className="form-input"
              value={form.language}
              onChange={e => setForm({ ...form, language: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Price (USD)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (hours)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={form.duration_hours}
              onChange={e => setForm({ ...form, duration_hours: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <input
            type="text"
            className="form-input"
            placeholder="python, web development, beginner (comma-separated)"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft (save for later)</option>
            <option value="PENDING">Submit for Review</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Creating...' : 'Create Course'}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

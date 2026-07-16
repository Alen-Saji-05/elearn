import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', password: '', password2: '',
    first_name: '', last_name: '', role: 'STUDENT'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const messages = Object.values(data).flat().join(' ');
        setError(messages || 'Registration failed.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <h1>Create Account</h1>
        <p className="subtitle">Join thousands of learners worldwide</p>

        {error && <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)' }}>{error}</div>}

        {/* Role Selector */}
        <div className="role-selector">
          {[
            { value: 'STUDENT', label: 'Student', icon: 'cap' },
            { value: 'MENTOR', label: 'Mentor', icon: 'user' },
            { value: 'ADMIN', label: 'Admin', icon: 'admin' },
          ].map(role => (
            <div
              key={role.value}
              className={`role-option ${form.role === role.value ? 'selected' : ''}`}
              onClick={() => setForm({ ...form, role: role.value })}
            >
              <span className="role-icon"><Icon name={role.icon} size={22} /></span>
              {role.label}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                id="register-first-name"
                type="text"
                className="form-input"
                placeholder="John"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                id="register-last-name"
                type="text"
                className="form-input"
                placeholder="Doe"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              id="register-username"
              type="text"
              className="form-input"
              placeholder="johndoe"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="john@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="register-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                id="register-password2"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password2}
                onChange={e => setForm({ ...form, password2: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

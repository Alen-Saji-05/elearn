import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Checkout() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState('STRIPE');

  // Check for success/cancel
  const sessionId = searchParams.get('session_id');
  const paymentProvider = searchParams.get('provider');
  const isSuccess = window.location.pathname.includes('/payment/success');
  const isCancel = window.location.pathname.includes('/payment/cancel');
  const [confirmError, setConfirmError] = useState(false);

  useEffect(() => {
    if (courseId) {
      api.get(`/courses/${courseId}/`)
        .then(res => setCourse(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [courseId]);

  // On return from Stripe, confirm the session so the enrollment is created
  // even when the webhook listener isn't running.
  useEffect(() => {
    if (isSuccess && sessionId) {
      api.post('/payments/stripe/confirm/', { session_id: sessionId })
        .catch(() => setConfirmError(true));
    }
  }, [isSuccess, sessionId]);

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/payments/checkout/', {
        course_id: course.id,
        provider,
      });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      alert(err.response?.data?.error || 'Checkout failed');
      setProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ background: 'none', WebkitTextFillColor: 'var(--success)' }}>Payment Successful!</h1>
          {confirmError ? (
            <p className="subtitle" style={{ color: 'var(--warning)' }}>
              Payment received, but enrollment is still processing. Refresh your dashboard in a moment.
            </p>
          ) : (
            <p className="subtitle">You are now enrolled. Start learning!</p>
          )}
          <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (isCancel) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😟</div>
          <h1 style={{ background: 'none', WebkitTextFillColor: 'var(--warning)' }}>Payment Cancelled</h1>
          <p className="subtitle">No worries, you can try again anytime.</p>
          <Link to="/courses" className="btn btn-primary btn-lg">Back to Courses</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!course) return <div className="empty-state"><h3>Course not found</h3></div>;

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <h1>Checkout</h1>
        <p className="subtitle">Complete your purchase</p>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{course.title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{course.short_description}</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.75rem' }}>
            ${course.price}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <div className="role-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div
              className={`role-option ${provider === 'STRIPE' ? 'selected' : ''}`}
              onClick={() => setProvider('STRIPE')}
            >
              <span className="role-icon">💳</span>
              Stripe
            </div>
            <div
              className={`role-option ${provider === 'PAYPAL' ? 'selected' : ''}`}
              onClick={() => setProvider('PAYPAL')}
            >
              <span className="role-icon">🅿️</span>
              PayPal
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleCheckout}
          disabled={processing}
        >
          {processing ? 'Processing...' : `Pay $${course.price}`}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          🔒 Secure payment powered by {provider === 'STRIPE' ? 'Stripe' : 'PayPal'}
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Icon from '../components/Icon';
import api from '../api/axios';

const CONTENT_ICON = { VIDEO: 'play', PDF: 'file', DOCUMENT: 'file', TEXT: 'text' };

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('curriculum');
  const [expandedModules, setExpandedModules] = useState({});
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Private Q&A: a student chats their OWN thread with the mentor. Mentors and
  // admins manage all student threads from the Q&A Inbox instead.
  const isCourseMentor = !!user && !!course?.mentor &&
    (course.mentor.id === user.id || course.mentor.username === user.username);
  const canChat = !!user && !!enrollment && user.role === 'STUDENT';

  // Determine course ID for WebSocket (need to fetch course first)
  const courseId = course?.id;
  const { messages: wsMessages, sendMessage, connected } = useWebSocket(
    canChat ? courseId : null,
    user?.id
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try by slug first, fall back to ID
        let res;
        try {
          res = await api.get(`/courses/${slug}/`);
        } catch {
          const listRes = await api.get(`/courses/?search=${slug}`);
          if (listRes.data.results?.length) {
            res = await api.get(`/courses/${listRes.data.results[0].id}/`);
          } else {
            navigate('/courses');
            return;
          }
        }
        setCourse(res.data);

        // Fetch reviews
        try {
          const reviewRes = await api.get(`/reviews/course/${res.data.id}/`);
          setReviews(reviewRes.data.results || reviewRes.data);
        } catch {}

        // Check enrollment
        if (user) {
          try {
            const enrollRes = await api.get('/enrollments/my/');
            const myEnrollments = enrollRes.data.results || enrollRes.data;
            const found = myEnrollments.find(e => e.course === res.data.id || e.course_title === res.data.title);
            setEnrollment(found || null);
          } catch {}
        }

        // Chat history — a student's own private thread
        if (user && user.role === 'STUDENT') {
          try {
            const chatRes = await api.get(`/chat/history/${res.data.id}/${user.id}/`);
            setChatMessages(chatRes.data.results || chatRes.data);
          } catch {}
        }
      } catch {
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, user]);

  // Merge WebSocket messages (dedupe by id so live updates never drop/duplicate)
  useEffect(() => {
    if (!wsMessages.length) return;
    setChatMessages(prev => {
      const seen = new Set(prev.map(m => m.id).filter(Boolean));
      const fresh = wsMessages.filter(m => !m.id || !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [wsMessages]);

  // Safety-net poll: refetch authoritative history every 4s (only updates on
  // change) so messages always appear even if a live WS frame is missed.
  useEffect(() => {
    if (!course || user?.role !== 'STUDENT') return;
    const poll = () => api.get(`/chat/history/${course.id}/${user.id}/`)
      .then(res => {
        const items = res.data.results || res.data;
        setChatMessages(prev => {
          const lastPrev = prev[prev.length - 1]?.id;
          const lastNew = items[items.length - 1]?.id;
          return (prev.length !== items.length || lastPrev !== lastNew) ? items : prev;
        });
      })
      .catch(() => {});
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [course, user]);

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }
    if (course.price > 0) {
      navigate(`/checkout/${course.id}`);
      return;
    }
    try {
      await api.post('/enrollments/enroll/', { course_id: course.id });
      setEnrollment({ status: 'ACTIVE', progress_percent: 0 });
    } catch (err) {
      alert(err.response?.data?.error || 'Enrollment failed');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/reviews/course/${course.id}/`, reviewForm);
      const res = await api.get(`/reviews/course/${course.id}/`);
      setReviews(res.data.results || res.data);
      setReviewForm({ rating: 5, comment: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit review');
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    try {
      const res = await api.post(`/chat/send/${course.id}/${user.id}/`, { content: text });
      setChatMessages(prev =>
        prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]
      );
    } catch {
      alert('Message failed to send. Try again.');
    }
  };

  const toggleModule = (id) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const downloadCertificate = async () => {
    if (!enrollment) return;
    try {
      const res = await api.get(`/enrollments/${enrollment.id}/certificate/`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${course.slug || course.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Certificate is available once you complete the course.');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!course) return null;

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="course-hero">
        <div className="course-hero-info">
          <div className="meta-badges">
            <span className="badge badge-purple">{course.level}</span>
            <span className="badge badge-green">{course.language}</span>
            {course.duration_hours > 0 && (
              <span className="badge badge-yellow">{course.duration_hours}h</span>
            )}
          </div>
          <h1>{course.title}</h1>
          <p className="description">{course.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Icon name="user" size={16} /> {course.mentor?.first_name || course.mentor?.username}
            </span>
            <span className="rating-display">★ {course.avg_rating} ({course.total_reviews} reviews)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Icon name="users" size={16} /> {course.total_enrollments} students
            </span>
          </div>
        </div>

        {/* Enroll Card */}
        <div className="enroll-card">
          <div className={`price ${course.price == 0 ? 'free' : ''}`}>
            {course.price == 0 ? 'Free' : `$${course.price}`}
          </div>
          {enrollment ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span>Progress</span>
                  <span>{enrollment.progress_percent}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${enrollment.progress_percent}%` }}></div>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate(`/learn/${course.slug || course.id}`)}>
                Continue Learning
              </button>
              {enrollment.status === 'COMPLETED' && (
                <button onClick={downloadCertificate} className="btn btn-secondary btn-lg" style={{ width: '100%', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Icon name="award" size={18} /> Download Certificate
                </button>
              )}
            </div>
          ) : (
            <button onClick={handleEnroll} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              {course.price > 0 ? 'Buy Now' : 'Enroll for Free'}
            </button>
          )}
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <p>✓ Full lifetime access</p>
            <p>✓ Certificate of completion</p>
            <p>✓ Access on mobile and desktop</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['curriculum', 'reviews', 'qa'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'curriculum' ? 'Curriculum' : tab === 'reviews' ? 'Reviews' : 'Q&A'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'curriculum' && (
        <div className="curriculum-section">
          {course.modules?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="courses" size={44} /></div>
              <h3>No modules yet</h3>
            </div>
          ) : (
            course.modules?.map(mod => (
              <div key={mod.id} className="module-item">
                <div className="module-header" onClick={() => toggleModule(mod.id)}>
                  <span>{expandedModules[mod.id] ? '▼' : '▶'} {mod.title}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {mod.lessons?.length || 0} lessons
                  </span>
                </div>
                {expandedModules[mod.id] && (
                  <div className="lesson-list">
                    {mod.lessons?.map(lesson => (
                      <div key={lesson.id} className="lesson-item">
                        <span className="lesson-icon"><Icon name={CONTENT_ICON[lesson.content_type] || 'text'} size={16} /></span>
                        <span>{lesson.title}</span>
                        {lesson.is_preview && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Preview</span>}
                        <span className="lesson-duration">
                          {lesson.duration_minutes > 0 ? `${lesson.duration_minutes}m` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          {/* Review Form */}
          {user && enrollment && (
            <form onSubmit={handleReviewSubmit} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Leave a Review</h3>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`star ${star <= reviewForm.rating ? 'filled' : ''}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      style={{ fontSize: '1.5rem' }}
                    >★</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-textarea"
                  placeholder="Share your experience..."
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">Submit Review</button>
            </form>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="star" size={44} /></div>
              <h3>No reviews yet</h3>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="chat-avatar">{(review.student_name || 'U')[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{review.student_name}</div>
                    <div className="rating-display">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{review.comment}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'qa' && (
        <div className="chat-panel">
          <div className="chat-header">
            <Icon name="chat" size={18} /> Q&A Discussion
            {connected && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Live</span>}
          </div>
          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={msg.id || i} className="chat-message">
                  <div className={`chat-avatar ${msg.sender_role === 'MENTOR' ? 'mentor' : ''}`}>
                    {(msg.sender_name || msg.sender || 'U')[0].toUpperCase()}
                  </div>
                  <div className="chat-bubble">
                    <div className={`sender-name ${msg.sender_role === 'MENTOR' ? 'mentor' : ''}`}>
                      {msg.sender_name || msg.sender}{msg.sender_role === 'MENTOR' && ' · Mentor'}
                    </div>
                    <div className="message-text">{msg.content}</div>
                    <div className="message-time">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {(isCourseMentor || user?.role === 'ADMIN') && (
            <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Student questions are private. Manage them in the <a href="/mentor/chats">Q&A Inbox</a>.
            </div>
          )}
          {canChat && (
            <form className="chat-input-area" onSubmit={handleSendChat}>
              <input
                type="text"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Send</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../api/axios';

const CONTENT_ICONS = { VIDEO: '🎥', PDF: '📄', DOCUMENT: '📝', TEXT: '📖' };

export default function LessonPlayer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [current, setCurrent] = useState(null); // { moduleId, lesson (full) }
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const { messages: wsMessages, sendMessage, connected } = useWebSocket(
    enrollment ? course?.id : null,
    user?.id
  );

  // Flat ordered list of {moduleId, lesson} for prev/next + auto-select
  const flatLessons = course
    ? course.modules.flatMap(m => m.lessons.map(l => ({ moduleId: m.id, lesson: l })))
    : [];

  const openLesson = useCallback(async (moduleId, lessonMeta) => {
    setLoadingLesson(true);
    try {
      const res = await api.get(`/courses/modules/${moduleId}/lessons/${lessonMeta.id}/`);
      setCurrent({ moduleId, lesson: res.data });
    } catch {
      setCurrent({ moduleId, lesson: lessonMeta });
    } finally {
      setLoadingLesson(false);
    }
  }, []);

  const loadProgress = useCallback(async (enrollmentId) => {
    try {
      const res = await api.get(`/enrollments/${enrollmentId}/progress/`);
      const items = res.data.results || res.data;
      setCompletedIds(new Set(items.filter(p => p.completed).map(p => p.lesson)));
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const courseRes = await api.get(`/courses/${slug}/`);
        const c = courseRes.data;
        setCourse(c);

        const enrollRes = await api.get('/enrollments/my/');
        const mine = enrollRes.data.results || enrollRes.data;
        const found = mine.find(e => e.course === c.id || e.course_slug === c.slug);
        if (!found) {
          // Not enrolled — send to the course page to enroll first
          navigate(`/courses/${c.slug || c.id}`);
          return;
        }
        setEnrollment(found);
        await loadProgress(found.id);

        // Load this student's own private Q&A thread
        try {
          const chatRes = await api.get(`/chat/history/${c.id}/${user.id}/`);
          setChatMessages(chatRes.data.results || chatRes.data);
        } catch {}

        // Auto-open first lesson
        const first = c.modules.flatMap(m => m.lessons.map(l => ({ moduleId: m.id, lesson: l })))[0];
        if (first) await openLesson(first.moduleId, first.lesson);
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  // Merge incoming WebSocket messages (dedupe by id)
  useEffect(() => {
    if (!wsMessages.length) return;
    setChatMessages(prev => {
      const seen = new Set(prev.map(m => m.id).filter(Boolean));
      const fresh = wsMessages.filter(m => !m.id || !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [wsMessages]);

  // Safety-net poll: refetch authoritative history every 4s (only updates on change)
  useEffect(() => {
    if (!course || !user) return;
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

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !course) return;
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

  const markComplete = async () => {
    if (!enrollment || !current) return;
    try {
      const res = await api.post(`/enrollments/${enrollment.id}/complete/${current.lesson.id}/`);
      setCompletedIds(prev => new Set(prev).add(current.lesson.id));
      setEnrollment(prev => ({ ...prev, progress_percent: res.data.progress_percent }));
    } catch {
      alert('Could not save progress.');
    }
  };

  const goNext = () => {
    const idx = flatLessons.findIndex(f => f.lesson.id === current?.lesson.id);
    const next = flatLessons[idx + 1];
    if (next) openLesson(next.moduleId, next.lesson);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!course || !enrollment) return null;

  const idx = flatLessons.findIndex(f => f.lesson.id === current?.lesson.id);
  const hasNext = idx >= 0 && idx < flatLessons.length - 1;
  const isDone = current && completedIds.has(current.lesson.id);
  const progress = Number(enrollment.progress_percent) || 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Curriculum sidebar */}
      <aside className="card" style={{ position: 'sticky', top: '1rem', maxHeight: '85vh', overflowY: 'auto' }}>
        <Link to={`/courses/${course.slug}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← {course.title}</Link>
        <div style={{ margin: '0.75rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
        </div>
        {course.modules.map(mod => (
          <div key={mod.id} style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0.5rem 0' }}>{mod.title}</div>
            {mod.lessons.map(lesson => {
              const active = current?.lesson.id === lesson.id;
              const done = completedIds.has(lesson.id);
              return (
                <div
                  key={lesson.id}
                  onClick={() => openLesson(mod.id, lesson)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.6rem', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '0.85rem',
                    background: active ? 'var(--accent-gradient)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <span>{done ? '✅' : (CONTENT_ICONS[lesson.content_type] || '📖')}</span>
                  <span style={{ flex: 1 }}>{lesson.title}</span>
                  {lesson.duration_minutes > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{lesson.duration_minutes}m</span>}
                </div>
              );
            })}
          </div>
        ))}
      </aside>

      {/* Player */}
      <main className="card" style={{ minHeight: '60vh' }}>
        {loadingLesson || !current ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{current.lesson.title}</h1>
            <LessonContent lesson={current.lesson} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              {isDone ? (
                <button className="btn btn-secondary" disabled>✓ Completed</button>
              ) : (
                <button className="btn btn-primary" onClick={markComplete}>Mark as Complete</button>
              )}
              {hasNext && <button className="btn btn-ghost" onClick={goNext}>Next Lesson →</button>}
              {progress >= 100 && (
                <a
                  href={`/api/enrollments/${enrollment.id}/certificate/`}
                  className="btn btn-secondary"
                  target="_blank" rel="noreferrer"
                >🎓 Download Certificate</a>
              )}
            </div>

            {/* Course Q&A */}
            <div className="chat-panel" style={{ marginTop: '2rem' }}>
              <div className="chat-header">
                💬 Course Q&A
                {connected && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>● Live</span>}
              </div>
              <div className="chat-messages" style={{ maxHeight: '340px' }}>
                {chatMessages.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <p>No messages yet. Ask the mentor a question!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={msg.id || i} className="chat-message">
                      <div className={`chat-avatar ${msg.sender_role === 'MENTOR' ? 'mentor' : ''}`}>
                        {(msg.sender_name || msg.sender || 'U')[0].toUpperCase()}
                      </div>
                      <div className="chat-bubble">
                        <div className={`sender-name ${msg.sender_role === 'MENTOR' ? 'mentor' : ''}`}>
                          {msg.sender_name || msg.sender} {msg.sender_role === 'MENTOR' && '🏅'}
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
              <form className="chat-input-area" onSubmit={handleSendChat}>
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Send</button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function LessonContent({ lesson }) {
  const { content_type, file, video_url, text_content } = lesson;

  if (content_type === 'VIDEO') {
    if (video_url) {
      // Support YouTube/Vimeo embeds or direct files
      const embed = toEmbedUrl(video_url);
      return embed
        ? <div style={{ position: 'relative', paddingTop: '56.25%' }}>
            <iframe src={embed} title={lesson.title} allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: '8px' }} />
          </div>
        : <video src={video_url} controls style={{ width: '100%', borderRadius: '8px' }} />;
    }
    if (file) return <video src={file} controls style={{ width: '100%', borderRadius: '8px' }} />;
  }

  if (content_type === 'PDF' && file) {
    return <iframe src={file} title={lesson.title} style={{ width: '100%', height: '75vh', border: 0, borderRadius: '8px' }} />;
  }

  if (content_type === 'DOCUMENT' && file) {
    return (
      <div>
        <iframe src={file} title={lesson.title} style={{ width: '100%', height: '70vh', border: 0, borderRadius: '8px' }} />
        <a href={file} className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" style={{ marginTop: '0.75rem' }}>⬇ Download document</a>
      </div>
    );
  }

  if (text_content) {
    return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{text_content}</div>;
  }

  return <div className="empty-state"><p>No content for this lesson yet.</p></div>;
}

function toEmbedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Icon from '../components/Icon';
import api from '../api/axios';

const CONTENT_ICON = { VIDEO: 'play', PDF: 'file', DOCUMENT: 'file', TEXT: 'text' };

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
  const [quizzesDone, setQuizzesDone] = useState(new Set()); // quiz ids submitted for current lesson

  const { messages: wsMessages, connected } = useWebSocket(
    enrollment ? course?.id : null,
    user?.id
  );

  const flatLessons = course
    ? course.modules.flatMap(m => m.lessons.map(l => ({ moduleId: m.id, lesson: l })))
    : [];

  const openLesson = useCallback(async (moduleId, lessonMeta) => {
    setLoadingLesson(true);
    setQuizzesDone(new Set());
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
          navigate(`/courses/${c.slug || c.id}`);
          return;
        }
        setEnrollment(found);
        await loadProgress(found.id);

        try {
          const chatRes = await api.get(`/chat/history/${c.id}/${user.id}/`);
          setChatMessages(chatRes.data.results || chatRes.data);
        } catch {}

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

  useEffect(() => {
    if (!wsMessages.length) return;
    setChatMessages(prev => {
      const seen = new Set(prev.map(m => m.id).filter(Boolean));
      const fresh = wsMessages.filter(m => !m.id || !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [wsMessages]);

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

  const downloadCertificate = async () => {
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
  const lessonQuizzes = current?.lesson.quizzes || [];
  const quizGatePassed = lessonQuizzes.length === 0 || lessonQuizzes.every(q => quizzesDone.has(q.id));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Curriculum sidebar */}
      <aside className="card" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 1rem)', maxHeight: '85vh', overflowY: 'auto' }}>
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
                    color: active ? 'var(--accent-ink)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon name={done ? 'check' : (CONTENT_ICON[lesson.content_type] || 'text')} size={16} />
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

            {/* Quizzes for this lesson */}
            {lessonQuizzes.map(quiz => (
              <QuizBlock
                key={quiz.id}
                quiz={quiz}
                onSubmitted={() => setQuizzesDone(prev => new Set(prev).add(quiz.id))}
              />
            ))}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {isDone ? (
                <button className="btn btn-secondary" disabled>
                  <Icon name="check" size={16} /> Completed
                </button>
              ) : (
                <button className="btn btn-primary" onClick={markComplete} disabled={!quizGatePassed}>
                  Mark as Complete
                </button>
              )}
              {!isDone && !quizGatePassed && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Submit the quiz to unlock completion.
                </span>
              )}
              {hasNext && <button className="btn btn-ghost" onClick={goNext}>Next Lesson →</button>}
              {progress >= 100 && (
                <button className="btn btn-secondary" onClick={downloadCertificate}>
                  <Icon name="award" size={16} /> Download Certificate
                </button>
              )}
            </div>

            {/* Course Q&A */}
            <div className="chat-panel" style={{ marginTop: '2rem' }}>
              <div className="chat-header">
                <Icon name="chat" size={18} /> Course Q&A
                {connected && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Live</span>}
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

  const video = (() => {
    if (content_type === 'VIDEO') {
      if (video_url) {
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
          <a href={file} className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" style={{ marginTop: '0.75rem' }}>Download document</a>
        </div>
      );
    }
    return null;
  })();

  const reading = text_content
    ? (
      <div style={{ marginTop: video ? '1.5rem' : 0 }}>
        {video && <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="text" size={18} /> Reading notes
        </h3>}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{text_content}</div>
      </div>
    )
    : null;

  if (!video && !reading) {
    return <div className="empty-state"><p>No content for this lesson yet.</p></div>;
  }
  return <>{video}{reading}</>;
}

function QuizBlock({ quiz, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = quiz.questions || [];
  const correctCount = questions.filter(q => answers[q.id] === q.correct_answer).length;
  const allAnswered = questions.every(q => answers[q.id] !== undefined);

  const submit = () => {
    setSubmitted(true);
    onSubmitted?.();
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem', background: 'var(--bg-tertiary)' }}>
      <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="spark" size={18} /> Quiz: {quiz.title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Answer all questions, then submit to check your understanding.
      </p>

      {questions.map((q, qi) => (
        <div key={q.id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{qi + 1}. {q.text}</div>
          {q.options.map((opt, oi) => {
            const chosen = answers[q.id] === oi;
            const isCorrect = q.correct_answer === oi;
            let bg = 'var(--bg-secondary)';
            let border = '1px solid var(--border)';
            if (submitted) {
              if (isCorrect) { bg = 'var(--success-light)'; border = '1px solid var(--success)'; }
              else if (chosen) { bg = 'var(--danger-light)'; border = '1px solid var(--danger)'; }
            } else if (chosen) {
              border = '1px solid var(--accent)';
            }
            return (
              <label key={oi} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)',
                marginBottom: '0.4rem', cursor: submitted ? 'default' : 'pointer',
                background: bg, border,
              }}>
                <input type="radio" name={`q-${q.id}`} disabled={submitted}
                  checked={chosen} onChange={() => setAnswers(a => ({ ...a, [q.id]: oi }))} />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      ))}

      {submitted ? (
        <div style={{ fontWeight: 600, color: correctCount === questions.length ? 'var(--success)' : 'var(--text-primary)' }}>
          You scored {correctCount} / {questions.length}
          {correctCount === questions.length ? ' — perfect!' : ''}
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={!allAnswered}>
          Submit Quiz
        </button>
      )}
    </div>
  );
}

function toEmbedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

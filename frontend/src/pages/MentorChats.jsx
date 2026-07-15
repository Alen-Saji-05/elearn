import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../api/axios';

export default function MentorChats() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]); // {courseId, courseTitle, studentId, studentName, lastMessage}
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);

  const { messages: wsMessages, sendMessage, connected } = useWebSocket(
    selected?.courseId ?? null,
    selected?.studentId ?? null
  );

  // Load the mentor's courses, then each course's student threads
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/courses/?ordering=-created_at');
        const all = res.data.results || res.data;
        const mine = all.filter(c =>
          c.mentor?.id === user.id || c.mentor?.username === user.username
        );
        const collected = [];
        for (const c of mine) {
          try {
            const tRes = await api.get(`/chat/threads/${c.id}/`);
            (tRes.data.threads || []).forEach(t => collected.push({
              courseId: c.id,
              courseTitle: c.title,
              studentId: t.student_id,
              studentName: t.student_name,
              lastMessage: t.last_message,
              count: t.message_count,
            }));
          } catch {}
        }
        setThreads(collected);
        if (collected.length) setSelected(collected[0]);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  // Load history when a thread is selected
  useEffect(() => {
    if (!selected) return;
    setMessages([]);
    setReplyTo(null);
    api.get(`/chat/history/${selected.courseId}/${selected.studentId}/`)
      .then(res => setMessages(res.data.results || res.data))
      .catch(() => {});
  }, [selected]);

  // Merge live messages (dedupe by id)
  useEffect(() => {
    if (!wsMessages.length) return;
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id).filter(Boolean));
      const fresh = wsMessages.filter(m => !m.id || !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [wsMessages]);

  // Safety-net poll: refetch the selected thread every 4s (only updates on change)
  useEffect(() => {
    if (!selected) return;
    const poll = () => api.get(`/chat/history/${selected.courseId}/${selected.studentId}/`)
      .then(res => {
        const items = res.data.results || res.data;
        setMessages(prev => {
          const lastPrev = prev[prev.length - 1]?.id;
          const lastNew = items[items.length - 1]?.id;
          return (prev.length !== items.length || lastPrev !== lastNew) ? items : prev;
        });
      })
      .catch(() => {});
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [selected]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selected) return;
    setInput('');
    const parent = replyTo?.id || null;
    setReplyTo(null);
    try {
      const res = await api.post(
        `/chat/send/${selected.courseId}/${selected.studentId}/`,
        { content: text, parent_id: parent }
      );
      setMessages(prev =>
        prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]
      );
    } catch {
      alert('Message failed to send. Try again.');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1>💬 Q&A Inbox</h1>
        <p>Private questions from your students. Each thread is visible only to you and that student.</p>
      </div>

      {threads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No questions yet</h3>
          <p>When a student asks a question in one of your courses, it appears here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Thread list */}
          <aside className="card" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 1rem)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Conversations</h3>
            {threads.map(t => {
              const active = selected?.courseId === t.courseId && selected?.studentId === t.studentId;
              return (
                <div
                  key={`${t.courseId}-${t.studentId}`}
                  onClick={() => setSelected(t)}
                  style={{
                    padding: '0.6rem 0.7rem', borderRadius: '8px', cursor: 'pointer',
                    marginBottom: '0.35rem',
                    background: active ? 'var(--accent-gradient)' : 'transparent',
                    color: active ? 'var(--accent-ink)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.studentName}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.courseTitle}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.lastMessage}
                  </div>
                </div>
              );
            })}
          </aside>

          {/* Selected thread */}
          <main className="chat-panel" style={{ minHeight: '60vh' }}>
            <div className="chat-header">
              {selected ? `${selected.studentName} · ${selected.courseTitle}` : 'Select a conversation'}
              {connected && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>● Live</span>}
            </div>
            <div className="chat-messages" style={{ maxHeight: '55vh' }}>
              {messages.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}><p>No messages.</p></div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id || i} className="chat-message">
                    <div className={`chat-avatar ${msg.sender_role === 'MENTOR' ? 'mentor' : ''}`}>
                      {(msg.sender_name || msg.sender || 'U')[0].toUpperCase()}
                    </div>
                    <div className="chat-bubble">
                      <div className={`sender-name ${msg.sender_role === 'MENTOR' ? 'mentor' : ''}`}>
                        {msg.sender_name || msg.sender} {msg.sender_role === 'MENTOR' && '🏅'}
                      </div>
                      <div className="message-text">{msg.content}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span className="message-time">
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                          onClick={() => setReplyTo(msg)}
                        >Reply</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {replyTo && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border)',
              }}>
                <span>Replying to "{replyTo.content.slice(0, 40)}"</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}

            <form className="chat-input-area" onSubmit={handleSend}>
              <input
                type="text"
                placeholder={selected ? 'Write a reply...' : 'Select a conversation first'}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={!selected}
              />
              <button type="submit" className="btn btn-primary" disabled={!selected}>Send</button>
            </form>
          </main>
        </div>
      )}
    </div>
  );
}

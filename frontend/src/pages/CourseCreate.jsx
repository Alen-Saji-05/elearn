import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Icon from '../components/Icon';

const emptyQuestion = () => ({ text: '', options: ['', '', '', ''], correct_answer: 0 });
const emptyLesson = () => ({
  title: '', content_type: 'VIDEO', video_url: '', text_content: '',
  duration_minutes: '', is_preview: false,
  hasQuiz: false, quizTitle: '', questions: [emptyQuestion()],
});
const emptyModule = () => ({ title: '', lessons: [emptyLesson()] });

export default function CourseCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', short_description: '',
    price: '0', level: 'BEGINNER', language: 'English',
    tags: '', duration_hours: '0', status: 'DRAFT',
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [modules, setModules] = useState([emptyModule()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onThumb = (e) => {
    const file = e.target.files?.[0];
    setThumbnail(file || null);
    setThumbPreview(file ? URL.createObjectURL(file) : '');
  };

  // --- module / lesson / quiz helpers ---
  const updateModule = (mi, patch) =>
    setModules(ms => ms.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  const addModule = () => setModules(ms => [...ms, emptyModule()]);
  const removeModule = (mi) => setModules(ms => ms.filter((_, i) => i !== mi));

  const updateLesson = (mi, li, patch) =>
    setModules(ms => ms.map((m, i) =>
      i === mi
        ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) }
        : m));
  const addLesson = (mi) =>
    setModules(ms => ms.map((m, i) => (i === mi ? { ...m, lessons: [...m.lessons, emptyLesson()] } : m)));
  const removeLesson = (mi, li) =>
    setModules(ms => ms.map((m, i) =>
      i === mi ? { ...m, lessons: m.lessons.filter((_, j) => j !== li) } : m));

  const updateQuestion = (mi, li, qi, patch) =>
    setModules(ms => ms.map((m, i) =>
      i === mi
        ? { ...m, lessons: m.lessons.map((l, j) =>
            j === li
              ? { ...l, questions: l.questions.map((q, k) => (k === qi ? { ...q, ...patch } : q)) }
              : l) }
        : m));
  const addQuestion = (mi, li) =>
    updateLesson(mi, li, { questions: [...modules[mi].lessons[li].questions, emptyQuestion()] });
  const removeQuestion = (mi, li, qi) =>
    updateLesson(mi, li, { questions: modules[mi].lessons[li].questions.filter((_, k) => k !== qi) });

  // --- validation ---
  const validate = () => {
    if (!form.title.trim()) return 'Course title is required.';
    if (!form.description.trim()) return 'Course description is required.';
    if (modules.length === 0) return 'Add at least one module.';
    for (const [mi, m] of modules.entries()) {
      if (!m.title.trim()) return `Module ${mi + 1} needs a title.`;
      if (m.lessons.length === 0) return `Module "${m.title}" needs at least one lesson.`;
      for (const [li, l] of m.lessons.entries()) {
        if (!l.title.trim()) return `Lesson ${li + 1} in "${m.title}" needs a title.`;
        if (l.content_type === 'VIDEO' && !l.video_url.trim())
          return `Lesson "${l.title}" is a video lesson — add a video URL.`;
        if (l.content_type === 'TEXT' && !l.text_content.trim())
          return `Lesson "${l.title}" is a reading lesson — add the reading content.`;
        if (l.hasQuiz) {
          if (!l.quizTitle.trim()) return `The quiz in "${l.title}" needs a title.`;
          for (const [qi, q] of l.questions.entries()) {
            if (!q.text.trim()) return `Question ${qi + 1} in the "${l.title}" quiz needs text.`;
            if (q.options.some(o => !o.trim()))
              return `All 4 options are required for question ${qi + 1} in "${l.title}".`;
          }
        }
      }
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setError('');
    setLoading(true);
    try {
      // 1. Create the course (multipart so the thumbnail uploads)
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('short_description', form.short_description);
      fd.append('price', String(parseFloat(form.price) || 0));
      fd.append('level', form.level);
      fd.append('language', form.language);
      fd.append('tags', form.tags);
      fd.append('duration_hours', String(parseInt(form.duration_hours) || 0));
      fd.append('status', form.status);
      if (thumbnail) fd.append('thumbnail', thumbnail);
      const courseRes = await api.post('/courses/', fd);
      const course = courseRes.data;

      // 2. Create modules → lessons → quizzes → questions
      for (const [mi, m] of modules.entries()) {
        const modRes = await api.post(`/courses/${course.id}/modules/`, {
          title: m.title, order: mi,
        });
        const moduleId = modRes.data.id;

        for (const [li, l] of m.lessons.entries()) {
          const lf = new FormData();
          lf.append('title', l.title);
          lf.append('content_type', l.content_type);
          lf.append('video_url', l.video_url);
          lf.append('text_content', l.text_content);
          lf.append('duration_minutes', String(parseInt(l.duration_minutes) || 0));
          lf.append('order', li);
          lf.append('is_preview', l.is_preview);
          const lessonRes = await api.post(`/courses/modules/${moduleId}/lessons/`, lf);
          const lessonId = lessonRes.data.id;

          if (l.hasQuiz) {
            const quizRes = await api.post(`/courses/lessons/${lessonId}/quizzes/`, {
              title: l.quizTitle,
            });
            const quizId = quizRes.data.id;
            for (const [qi, q] of l.questions.entries()) {
              await api.post(`/courses/quizzes/${quizId}/questions/`, {
                text: q.text,
                options: q.options,
                correct_answer: Number(q.correct_answer),
                order: qi,
              });
            }
          }
        }
      }

      navigate(`/courses/${course.slug || course.id}`);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Failed to create course.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="dashboard-header">
        <h1>Create New Course</h1>
        <p>Fill in the details and build the full curriculum — every lesson needs a video or reading content before you publish.</p>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ---- Course details ---- */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Course Details</h2>

          <div className="form-group">
            <label className="form-label">Thumbnail</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{
                width: 160, height: 90, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0,
              }}>
                {thumbPreview
                  ? <img src={thumbPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Icon name="book" size={28} />}
              </div>
              <input type="file" accept="image/*" onChange={onThumb} className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Course Title *</label>
            <input type="text" className="form-input" placeholder="e.g. Complete Python Masterclass"
              value={form.title} onChange={e => setField('title', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Short Description</label>
            <input type="text" className="form-input" placeholder="A brief summary (shown on course cards)"
              value={form.short_description} onChange={e => setField('short_description', e.target.value)} maxLength={500} />
          </div>

          <div className="form-group">
            <label className="form-label">Full Description *</label>
            <textarea className="form-textarea" placeholder="Detailed course description..."
              value={form.description} onChange={e => setField('description', e.target.value)} required style={{ minHeight: 130 }} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-select" value={form.level} onChange={e => setField('level', e.target.value)}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <input type="text" className="form-input" value={form.language} onChange={e => setField('language', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price (USD)</label>
              <input type="number" className="form-input" min="0" step="0.01" value={form.price} onChange={e => setField('price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (hours)</label>
              <input type="number" className="form-input" min="0" value={form.duration_hours} onChange={e => setField('duration_hours', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <input type="text" className="form-input" placeholder="python, web development (comma-separated)"
              value={form.tags} onChange={e => setField('tags', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="DRAFT">Draft (save for later)</option>
              <option value="PENDING">Submit for Review</option>
            </select>
          </div>
        </div>

        {/* ---- Curriculum ---- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Curriculum</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addModule}>
            <Icon name="create" size={16} /> Add Module
          </button>
        </div>

        {modules.map((mod, mi) => (
          <div key={mi} className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Module {mi + 1} Title *</label>
                <input type="text" className="form-input" placeholder="e.g. Getting Started"
                  value={mod.title} onChange={e => updateModule(mi, { title: e.target.value })} />
              </div>
              {modules.length > 1 && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeModule(mi)} title="Remove module">
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>

            {mod.lessons.map((lesson, li) => (
              <div key={li} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="form-label">Lesson {li + 1} Title *</label>
                    <input type="text" className="form-input" placeholder="e.g. Installing the tools"
                      value={lesson.title} onChange={e => updateLesson(mi, li, { title: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ width: 150, margin: 0 }}>
                    <label className="form-label">Type</label>
                    <select className="form-select" value={lesson.content_type}
                      onChange={e => updateLesson(mi, li, { content_type: e.target.value })}>
                      <option value="VIDEO">Video</option>
                      <option value="TEXT">Reading</option>
                    </select>
                  </div>
                  {mod.lessons.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLesson(mi, li)} title="Remove lesson">
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>

                {lesson.content_type === 'VIDEO' && (
                  <div className="form-group">
                    <label className="form-label">Video URL * (YouTube, Vimeo, ...)</label>
                    <input type="url" className="form-input" placeholder="https://www.youtube.com/watch?v=..."
                      value={lesson.video_url} onChange={e => updateLesson(mi, li, { video_url: e.target.value })} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    {lesson.content_type === 'TEXT' ? 'Reading Content *' : 'Reading Notes (shown below the video)'}
                  </label>
                  <textarea className="form-textarea"
                    placeholder="Write the lesson's reading material — explain the topic in text so learners can read along, not just watch."
                    value={lesson.text_content} onChange={e => updateLesson(mi, li, { text_content: e.target.value })}
                    style={{ minHeight: 110 }} />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Duration (minutes)</label>
                    <input type="number" className="form-input" min="0" value={lesson.duration_minutes}
                      onChange={e => updateLesson(mi, li, { duration_minutes: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={lesson.is_preview}
                        onChange={e => updateLesson(mi, li, { is_preview: e.target.checked })} />
                      Free preview
                    </label>
                  </div>
                </div>

                {/* Quiz */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={lesson.hasQuiz}
                    onChange={e => updateLesson(mi, li, { hasQuiz: e.target.checked })} />
                  Add a quiz after this lesson
                </label>

                {lesson.hasQuiz && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Quiz Title *</label>
                      <input type="text" className="form-input" placeholder="e.g. Check your understanding"
                        value={lesson.quizTitle} onChange={e => updateLesson(mi, li, { quizTitle: e.target.value })} />
                    </div>
                    {lesson.questions.map((q, qi) => (
                      <div key={qi} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                          <div className="form-group" style={{ flex: 1, margin: 0 }}>
                            <label className="form-label">Question {qi + 1} *</label>
                            <input type="text" className="form-input" value={q.text}
                              onChange={e => updateQuestion(mi, li, qi, { text: e.target.value })} />
                          </div>
                          {lesson.questions.length > 1 && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeQuestion(mi, li, qi)} title="Remove question">
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Select the radio next to the correct answer.
                        </div>
                        {q.options.map((opt, oi) => (
                          <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <input type="radio" name={`correct-${mi}-${li}-${qi}`}
                              checked={Number(q.correct_answer) === oi}
                              onChange={() => updateQuestion(mi, li, qi, { correct_answer: oi })} />
                            <input type="text" className="form-input" placeholder={`Option ${oi + 1}`}
                              value={opt}
                              onChange={e => updateQuestion(mi, li, qi, {
                                options: q.options.map((o, k) => (k === oi ? e.target.value : o)),
                              })} />
                          </div>
                        ))}
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addQuestion(mi, li)}>
                      <Icon name="create" size={15} /> Add Question
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addLesson(mi)}>
              <Icon name="create" size={15} /> Add Lesson
            </button>
          </div>
        ))}

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

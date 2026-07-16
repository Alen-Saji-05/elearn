import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import api from '../api/axios';

export default function Dashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'STUDENT') {
          const res = await api.get('/enrollments/my/');
          setEnrollments(res.data.results || res.data);
        }
        if (user.role === 'MENTOR') {
          const res = await api.get('/courses/?ordering=-created_at');
          const allCourses = res.data.results || res.data;
          setCourses(allCourses.filter(c => c.mentor?.id === user.id || c.mentor?.username === user.username));
        }
        if (user.role === 'ADMIN') {
          try {
            const [usersRes, coursesRes] = await Promise.all([
              api.get('/users/'),
              api.get('/courses/'),
            ]);
            const users = usersRes.data.results || usersRes.data;
            const allCourses = coursesRes.data.results || coursesRes.data;
            setStats({
              totalUsers: users.length,
              totalCourses: allCourses.length,
              pendingCourses: allCourses.filter(c => c.status === 'PENDING').length,
              pendingMentors: users.filter(u => u.role === 'MENTOR' && !u.is_approved).length,
            });
          } catch {}
        }
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1>
          {user.role === 'STUDENT' && 'My Learning'}
          {user.role === 'MENTOR' && 'Mentor Dashboard'}
          {user.role === 'ADMIN' && 'Admin Dashboard'}
        </h1>
        <p>Welcome back, {user.first_name || user.username}!</p>
      </div>

      {/* Student Dashboard */}
      {user.role === 'STUDENT' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple"><Icon name="courses" /></div>
              <div>
                <div className="stat-value">{enrollments.length}</div>
                <div className="stat-label">Enrolled Courses</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Icon name="check" /></div>
              <div>
                <div className="stat-value">{enrollments.filter(e => e.status === 'COMPLETED').length}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><Icon name="text" /></div>
              <div>
                <div className="stat-value">{enrollments.filter(e => e.status === 'ACTIVE').length}</div>
                <div className="stat-label">In Progress</div>
              </div>
            </div>
          </div>

          <div className="section-header">
            <h2>My Courses</h2>
            <Link to="/courses" className="btn btn-ghost">Browse More →</Link>
          </div>

          {enrollments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="courses" size={44} /></div>
              <h3>No courses yet</h3>
              <p>Start learning by enrolling in a course!</p>
              <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Courses</Link>
            </div>
          ) : (
            <div className="course-grid">
              {enrollments.map(enrollment => (
                <Link to={`/learn/${enrollment.course_slug || enrollment.course}`} key={enrollment.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card course-card">
                    {enrollment.course_thumbnail ? (
                      <img src={enrollment.course_thumbnail} alt={enrollment.course_title} className="card-thumbnail" />
                    ) : (
                      <div className="card-thumbnail" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent-ink)', background: 'var(--accent-gradient)'
                      }}><Icon name="book" size={40} /></div>
                    )}
                    <div className="card-body">
                      <h3 className="card-title">{enrollment.course_title}</h3>
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                          <span>Progress</span>
                          <span>{enrollment.progress_percent}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${enrollment.progress_percent}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className={`status-badge ${enrollment.status.toLowerCase()}`}>
                        {enrollment.status}
                      </span>
                      <span className="btn btn-primary btn-sm">Continue →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mentor Dashboard */}
      {user.role === 'MENTOR' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple"><Icon name="courses" /></div>
              <div>
                <div className="stat-value">{courses.length}</div>
                <div className="stat-label">My Courses</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Icon name="check" /></div>
              <div>
                <div className="stat-value">{courses.filter(c => c.status === 'PUBLISHED').length}</div>
                <div className="stat-label">Published</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><Icon name="clock" /></div>
              <div>
                <div className="stat-value">{courses.filter(c => c.status === 'PENDING').length}</div>
                <div className="stat-label">Pending Approval</div>
              </div>
            </div>
          </div>

          <div className="section-header">
            <h2>My Courses</h2>
            <Link to="/courses/create" className="btn btn-primary">+ Create Course</Link>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="cap" size={44} /></div>
              <h3>No courses yet</h3>
              <p>Create your first course and start teaching!</p>
              <Link to="/courses/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Course</Link>
            </div>
          ) : (
            <div className="course-grid">
              {courses.map(course => (
                <Link to={`/courses/${course.slug || course.id}`} key={course.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card course-card">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="card-thumbnail" />
                    ) : (
                      <div className="card-thumbnail" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent-ink)', background: 'var(--accent-gradient)'
                      }}><Icon name="book" size={40} /></div>
                    )}
                    <div className="card-body">
                      <h3 className="card-title">{course.title}</h3>
                      <div className="card-meta">
                        <span className="rating-display">★ {course.avg_rating || '0.00'}</span>
                        <span>{course.total_enrollments} students</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className={`status-badge ${(course.status || '').toLowerCase()}`}>{course.status}</span>
                      <span className="card-price">{course.price == 0 ? 'Free' : `$${course.price}`}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Dashboard */}
      {user.role === 'ADMIN' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple"><Icon name="users" /></div>
              <div>
                <div className="stat-value">{stats.totalUsers || 0}</div>
                <div className="stat-label">Total Users</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Icon name="courses" /></div>
              <div>
                <div className="stat-value">{stats.totalCourses || 0}</div>
                <div className="stat-label">Total Courses</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><Icon name="clock" /></div>
              <div>
                <div className="stat-value">{stats.pendingCourses || 0}</div>
                <div className="stat-label">Pending Courses</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><Icon name="user" /></div>
              <div>
                <div className="stat-value">{stats.pendingMentors || 0}</div>
                <div className="stat-label">Pending Mentors</div>
              </div>
            </div>
          </div>
          <Link to="/admin" className="btn btn-primary">Go to Admin Panel →</Link>
        </div>
      )}
    </div>
  );
}

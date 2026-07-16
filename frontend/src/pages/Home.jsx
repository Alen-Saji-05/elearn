import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import api from '../api/axios';

export default function Home() {
  const [featuredCourses, setFeaturedCourses] = useState([]);

  useEffect(() => {
    api.get('/courses/?ordering=-total_enrollments&page_size=6')
      .then(res => setFeaturedCourses(res.data.results || res.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <h1>
          Learn Without Limits,<br />
          <span className="hero-accent">Grow Without Boundaries</span>
        </h1>
        <p>
          Master new skills with expert-led courses. From coding to creativity,
          find the perfect learning path designed just for you.
        </p>
        <div className="hero-actions">
          <Link to="/courses" className="btn btn-primary btn-lg">
            Explore Courses →
          </Link>
          <Link to="/register" className="btn btn-secondary btn-lg">
            Become a Mentor
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid" style={{ maxWidth: 800, margin: '0 auto 3rem' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><Icon name="courses" /></div>
          <div>
            <div className="stat-value">500+</div>
            <div className="stat-label">Courses</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Icon name="users" /></div>
          <div>
            <div className="stat-value">10K+</div>
            <div className="stat-label">Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Icon name="cap" /></div>
          <div>
            <div className="stat-value">100+</div>
            <div className="stat-label">Mentors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Icon name="award" /></div>
          <div>
            <div className="stat-value">95%</div>
            <div className="stat-label">Satisfaction</div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section>
        <div className="section-header">
          <h2>Popular Courses</h2>
          <Link to="/courses" className="btn btn-ghost">View All →</Link>
        </div>
        <div className="course-grid">
          {featuredCourses.map(course => (
            <Link to={`/courses/${course.slug || course.id}`} key={course.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card course-card">
                <div className="card-thumbnail" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-ink)', background: 'var(--accent-gradient)'
                }}><Icon name="book" size={40} /></div>
                <div className="card-body">
                  <h3 className="card-title">{course.title}</h3>
                  <p className="card-desc">{course.short_description || course.description}</p>
                  <div className="card-meta">
                    <span className="rating-display">★ {course.avg_rating || '0.00'}</span>
                    <span>{course.mentor?.first_name || course.mentor?.username || 'Mentor'}</span>
                    <span>{course.level}</span>
                  </div>
                </div>
                <div className="card-footer">
                  <span className={`card-price ${course.price == 0 ? 'free' : ''}`}>
                    {course.price == 0 ? 'Free' : `$${course.price}`}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {course.total_enrollments} enrolled
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {featuredCourses.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="courses" size={44} /></div>
            <h3>No courses yet</h3>
            <p>Be the first to create a course!</p>
          </div>
        )}
      </section>
    </div>
  );
}

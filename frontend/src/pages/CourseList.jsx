import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import api from '../api/axios';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [filters, setFilters] = useState({
    level: searchParams.get('level') || '',
    language: searchParams.get('language') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    ordering: searchParams.get('ordering') || '-created_at',
  });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filters.level) params.set('level', filters.level);
      if (filters.language) params.set('language', filters.language);
      if (filters.min_price) params.set('min_price', filters.min_price);
      if (filters.max_price) params.set('max_price', filters.max_price);
      if (filters.ordering) params.set('ordering', filters.ordering);

      const res = await api.get(`/courses/?${params.toString()}`);
      setCourses(res.data.results || res.data);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  // Autocomplete
  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        // ORM-based autocomplete (no Elasticsearch dependency)
        const res = await api.get(`/courses/?search=${searchQuery}&page_size=5`);
        const items = res.data.results || res.data;
        setSuggestions(items.map(c => ({ id: c.slug || c.id, title: c.title })));
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Explore Courses</h1>
        <p>Find the perfect course to level up your skills</p>
      </div>

      {/* Search */}
      <div className="search-container" style={{ margin: '0 auto 2rem', maxWidth: 700 }}>
        <form onSubmit={handleSearch}>
          <span className="search-icon"><Icon name="search" size={18} /></span>
          <input
            id="course-search-input"
            type="text"
            className="search-input"
            placeholder="Search courses, topics, mentors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>
        {suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map(s => (
              <Link
                key={s.id}
                to={`/courses/${s.id}`}
                className="search-suggestion-item"
                onClick={() => setSuggestions([])}
              >
                {s.title}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="page-with-sidebar">
        {/* Filters */}
        <aside className="filters-sidebar">
          <div className="filter-group">
            <h3>Level</h3>
            {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(lvl => (
              <label key={lvl} className="filter-option">
                <input
                  type="radio"
                  name="level"
                  checked={filters.level === lvl}
                  onChange={() => setFilters({ ...filters, level: filters.level === lvl ? '' : lvl })}
                />
                {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
              </label>
            ))}
            {filters.level && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...filters, level: '' })}>
                Clear
              </button>
            )}
          </div>

          <div className="filter-group">
            <h3>Price</h3>
            <label className="filter-option">
              <input
                type="radio" name="price"
                checked={filters.max_price === '0'}
                onChange={() => setFilters({ ...filters, min_price: '', max_price: '0' })}
              />
              Free
            </label>
            <label className="filter-option">
              <input
                type="radio" name="price"
                checked={filters.min_price === '1' && filters.max_price === '50'}
                onChange={() => setFilters({ ...filters, min_price: '1', max_price: '50' })}
              />
              $1 — $50
            </label>
            <label className="filter-option">
              <input
                type="radio" name="price"
                checked={filters.min_price === '50'}
                onChange={() => setFilters({ ...filters, min_price: '50', max_price: '' })}
              />
              $50+
            </label>
            {(filters.min_price || filters.max_price) && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...filters, min_price: '', max_price: '' })}>
                Clear
              </button>
            )}
          </div>

          <div className="filter-group">
            <h3>Sort By</h3>
            <select
              className="form-select"
              value={filters.ordering}
              onChange={e => setFilters({ ...filters, ordering: e.target.value })}
            >
              <option value="-created_at">Newest</option>
              <option value="-avg_rating">Highest Rated</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="-total_enrollments">Most Popular</option>
            </select>
          </div>
        </aside>

        {/* Results */}
        <main>
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="search" size={44} /></div>
              <h3>No courses found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="course-grid">
              {courses.map(course => (
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
                        <span>{course.total_enrollments} students</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className={`card-price ${course.price == 0 ? 'free' : ''}`}>
                        {course.price == 0 ? 'Free' : `$${course.price}`}
                      </span>
                      <span className="badge badge-purple">{course.level}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

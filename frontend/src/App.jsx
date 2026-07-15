import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Icon from './components/Icon';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import LessonPlayer from './pages/LessonPlayer';
import CourseCreate from './pages/CourseCreate';
import MentorChats from './pages/MentorChats';
import Dashboard from './pages/Dashboard';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

// Focus tasks render full-screen without the app rail.
const BARE_ROUTES = ['/login', '/register'];

function BareThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle bare-theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
    </button>
  );
}

function AppInner() {
  const { pathname } = useLocation();
  const bare = BARE_ROUTES.includes(pathname);

  const routes = (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/courses" element={<CourseList />} />
      <Route path="/courses/:slug" element={<CourseDetail />} />

      {/* Authenticated */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/learn/:slug" element={
        <ProtectedRoute><LessonPlayer /></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />

      {/* Student */}
      <Route path="/checkout/:courseId" element={
        <ProtectedRoute roles={['STUDENT']}><Checkout /></ProtectedRoute>
      } />
      <Route path="/payment/success" element={<Checkout />} />
      <Route path="/payment/cancel" element={<Checkout />} />

      {/* Mentor */}
      <Route path="/courses/create" element={
        <ProtectedRoute roles={['MENTOR']}><CourseCreate /></ProtectedRoute>
      } />
      <Route path="/mentor/chats" element={
        <ProtectedRoute roles={['MENTOR']}><MentorChats /></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['ADMIN']}><AdminPanel /></ProtectedRoute>
      } />
    </Routes>
  );

  if (bare) {
    return (
      <div className="bare-layout">
        <BareThemeToggle />
        {routes}
      </div>
    );
  }

  return <Layout>{routes}</Layout>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </Router>
  );
}

export default App;

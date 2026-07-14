import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

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

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
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
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'

// Auth
import Login from './pages/Login'

// Student pages
import StudentDashboard  from './pages/student/Dashboard'
import StudentContent    from './pages/student/Content'
import StudentAssignments from './pages/student/Assignments'
import StudentForum      from './pages/student/Forum'
import StudentCalendar   from './pages/student/Calendar'
import StudentGamification from './pages/student/Gamification'

// Lecturer pages
import LecturerDashboard  from './pages/lecturer/Dashboard'
import LecturerContent    from './pages/lecturer/Content'
import LecturerAssignments from './pages/lecturer/Assignments'
import LecturerForum      from './pages/lecturer/Forum'
import LecturerCalendar   from './pages/lecturer/Calendar'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers     from './pages/admin/Users'
import AdminAnalytics from './pages/admin/Analytics'
import AdminCalendar  from './pages/admin/Calendar'
import AdminForum     from './pages/admin/Forum'

function StudentLayout({ children }) {
  return (
    <ProtectedRoute allowedRole="student">
      {children}
    </ProtectedRoute>
  )
}
function LecturerLayout({ children }) {
  return (
    <ProtectedRoute allowedRole="lecturer">
      {children}
    </ProtectedRoute>
  )
}
function AdminLayout({ children }) {
  return (
    <ProtectedRoute allowedRole="admin">
      {children}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Student routes */}
          <Route path="/student"            element={<StudentLayout><StudentDashboard /></StudentLayout>} />
          <Route path="/student/content"    element={<StudentLayout><StudentContent /></StudentLayout>} />
          <Route path="/student/assignments" element={<StudentLayout><StudentAssignments /></StudentLayout>} />
          <Route path="/student/forum"      element={<StudentLayout><StudentForum /></StudentLayout>} />
          <Route path="/student/calendar"   element={<StudentLayout><StudentCalendar /></StudentLayout>} />
          <Route path="/student/gamification" element={<StudentLayout><StudentGamification /></StudentLayout>} />

          {/* Lecturer routes */}
          <Route path="/lecturer"             element={<LecturerLayout><LecturerDashboard /></LecturerLayout>} />
          <Route path="/lecturer/content"     element={<LecturerLayout><LecturerContent /></LecturerLayout>} />
          <Route path="/lecturer/assignments" element={<LecturerLayout><LecturerAssignments /></LecturerLayout>} />
          <Route path="/lecturer/forum"       element={<LecturerLayout><LecturerForum /></LecturerLayout>} />
          <Route path="/lecturer/calendar"    element={<LecturerLayout><LecturerCalendar /></LecturerLayout>} />

          {/* Admin routes */}
          <Route path="/admin"           element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/users"     element={<AdminLayout><AdminUsers /></AdminLayout>} />
          <Route path="/admin/analytics" element={<AdminLayout><AdminAnalytics /></AdminLayout>} />
          <Route path="/admin/forum"     element={<AdminLayout><AdminForum /></AdminLayout>} />
          <Route path="/admin/calendar"  element={<AdminLayout><AdminCalendar /></AdminLayout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
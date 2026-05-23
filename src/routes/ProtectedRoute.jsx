import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role } = useAuth()

  if (!user) return <Navigate to="/" replace />
  if (allowedRole && role !== allowedRole) {
    // Redirect to correct dashboard based on actual role
    const redirectMap = { student: '/student', lecturer: '/lecturer', admin: '/admin' }
    return <Navigate to={redirectMap[role] || '/'} replace />
  }

  return children
}

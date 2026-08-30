import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ProfileModal from './ProfileModal'
import toast from 'react-hot-toast'

const navConfigs = {
  student: [
    { to: '/student',              label: 'Dashboard',    icon: HomeIcon },
    { to: '/student/content',      label: 'Content',      icon: BookIcon },
    { to: '/student/videos',       label: 'Videos',       icon: VideoIcon },
    { to: '/student/assignments',  label: 'Assignments',  icon: ClipboardIcon },
    { to: '/student/forum',        label: 'Forum',        icon: ChatIcon },
    { to: '/student/calendar',     label: 'Calendar',     icon: CalendarIcon },
    { to: '/student/gamification', label: 'Achievements', icon: TrophyIcon },
    { to: '/student/exams', label: 'Exams', icon: ClipboardIcon },

  ],
  lecturer: [
    { to: '/lecturer',             label: 'Dashboard',    icon: HomeIcon },
    { to: '/lecturer/content',     label: 'Content',      icon: BookIcon },
    { to: '/lecturer/videos',      label: 'Videos',       icon: VideoIcon },
    { to: '/lecturer/assignments', label: 'Assignments',  icon: ClipboardIcon },
    { to: '/lecturer/forum',       label: 'Forum',        icon: ChatIcon },
    { to: '/lecturer/calendar',    label: 'Calendar',     icon: CalendarIcon },
    { to: '/lecturer/exams', label: 'Exams', icon: ClipboardIcon },

  ],
  admin: [
    { to: '/admin',           label: 'Dashboard',  icon: HomeIcon },
    { to: '/admin/users',     label: 'Users',      icon: UsersIcon },
    { to: '/admin/analytics', label: 'Analytics',  icon: ChartIcon },
    { to: '/admin/videos',    label: 'Videos',     icon: VideoIcon },
    { to: '/admin/assignments', label: 'Assignments', icon: ClipboardIcon },
    { to: '/admin/forum',     label: 'Forum',      icon: ChatIcon },
    { to: '/admin/calendar',  label: 'Calendar',   icon: CalendarIcon },
    { to: '/admin/exams', label: 'Exams', icon: ClipboardIcon },
  ],
}

const roleColors = {
  student:  'text-primary-700',
  lecturer: 'text-accent-700',
  admin:    'text-emerald-700',
}
const roleBadge = {
  student:  'badge-purple',
  lecturer: 'badge-amber',
  admin:    'badge-green',
}

function SidebarContent({ onNavigate }) {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const links = navConfigs[role] || []
  const [showProfile, setShowProfile] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  return (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span className="font-display text-white font-700 text-lg">EduCore</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative z-10">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === `/${role}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-white/10 relative z-10">
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors mb-2 w-full text-left"
        >
          <div className={`w-8 h-8 rounded-full bg-white border border-white/20 flex items-center justify-center text-sm font-600 flex-shrink-0 ${roleColors[role]}`}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.email}</p>
            <span className={`badge ${roleBadge[role]} mt-0.5`}>{role}</span>
          </div>
        </button>
        <button onClick={handleLogout} className="nav-link w-full text-red-300 hover:text-red-100 hover:bg-red-500/20">
          <LogoutIcon className="w-4 h-4" />
          Sign out
        </button>
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}

// Shared dark navy background treatment — dot-grid + glow accents,
// matching the Login screen's left brand panel for a consistent identity
// across every authenticated page.
function SidebarBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800" />
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-accent-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -left-16 w-64 h-64 bg-primary-400/10 rounded-full blur-3xl" />
    </>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 min-h-screen flex-col fixed left-0 top-0 bottom-0 z-20 overflow-hidden">
      <SidebarBackdrop />
      <SidebarContent />
    </aside>
  )
}

// Layout wrapper used by every protected page — handles mobile hamburger + desktop fixed sidebar
export function PageLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen app-bg">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span className="font-display text-slate-900 font-700 text-base">EduCore</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[80%] flex flex-col shadow-card-hover animate-slide-up overflow-hidden">
            <SidebarBackdrop />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:bg-white/10 z-10"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}

// ── Inline icons ──────────────────────────────────────────────────────────────
function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function VideoIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.75 10.5l4.72-2.72a.75.75 0 011.28.53v9.38a.75.75 0 01-1.28.53l-4.72-2.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9A2.25 2.25 0 002.25 9v7.5a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}
function BookIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
function ClipboardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}
function ChatIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}
function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}
function TrophyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  )
}
function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}
function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}
function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  )
}
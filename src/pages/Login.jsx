import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const features = [
  { icon: '📚', title: 'Centralised Content', text: 'Every lecture, slide, and resource in one library.' },
  { icon: '⚡', title: 'Adaptive Engagement', text: 'BAGE learns your rhythm and keeps you moving forward.' },
  { icon: '📊', title: 'Real Insight', text: 'Progress, grades, and analytics — always up to date.' },
]

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { login, user, role }   = useAuth()
  const navigate                = useNavigate()

  useEffect(() => {
    if (user && role) {
      const map = { student: '/student', lecturer: '/lecturer', admin: '/admin' }
      navigate(map[role] || '/', { replace: true })
    }
  }, [user, role, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      toast.error('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen lg:flex bg-white">
      {/* Left — brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 overflow-hidden">
        {/* Dot-grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Glow accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="font-display text-white font-700 text-xl">EduCore</span>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-4xl xl:text-5xl font-700 text-white leading-tight mb-4">
              Learning, <span className="text-accent-400">adapted</span> to you.
            </h1>
            <p className="text-primary-100/80 text-base mb-10 leading-relaxed">
              A unified platform for content, assignments, collaboration, and a gamification engine that actually pays attention.
            </p>

            <div className="space-y-5">
              {features.map(f => (
                <div key={f.title} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-white font-600 text-sm">{f.title}</p>
                    <p className="text-primary-200/70 text-xs mt-0.5">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-primary-300/50 text-xs">Next-Generation Learning Platform</p>
        </div>
      </div>

      {/* Right — sign-in form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile-only brand header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-card mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-700 text-slate-900">EduCore LMS</h1>
            <p className="text-slate-500 mt-1 text-sm">Next-Generation Learning Platform</p>
          </div>

          <h2 className="font-display text-2xl font-700 text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to continue to your dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2 shadow-glow"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              New accounts are created by your administrator.
            </p>
          </div>

          <div className="mt-4 card-sm border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Demo roles — Admin creates Student &amp; Lecturer accounts from the Admin panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
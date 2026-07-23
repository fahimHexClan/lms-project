import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import ActiveChallenges from '../../components/bage/ActiveChallenges'
import Leaderboard from '../../components/bage/Leaderboard'

function StatCard({ label, value, sub, color = 'text-primary-700' }) {
  return (
    <div className="card-sm">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-display font-700 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [profile, setProfile]           = useState(null)
  const [recentAssignments, setRecent]  = useState([])
  const [pendingCount, setPending]      = useState(0)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [user])

  useEffect(() => {
    const fetchAssignments = async () => {
      const snap = await getDocs(
        query(collection(db, 'assignments'), orderBy('deadline', 'asc'), limit(5))
      )
      setRecent(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    fetchAssignments()
  }, [])

  useEffect(() => {
    const fetchPending = async () => {
      if (!user) return
      const all = await getDocs(collection(db, 'assignments'))
      const submitted = await getDocs(
        query(collection(db, 'submissions'), where('studentId', '==', user.uid))
      )
      const submittedIds = new Set(submitted.docs.map(d => d.data().assignmentId))
      setPending(all.docs.filter(d => !submittedIds.has(d.id)).length)
    }
    fetchPending()
  }, [user])

  const streakEmoji = (n) => n >= 7 ? '🔥🔥🔥' : n >= 3 ? '🔥🔥' : n >= 1 ? '🔥' : '—'

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">
            Welcome back, {profile?.displayName?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's your learning overview for today.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Points"
            value={(profile?.points || 0).toLocaleString()}
            sub="Keep earning!"
            color="text-accent-700"
          />
          <StatCard
            label="Login Streak"
            value={streakEmoji(profile?.loginStreak || 0)}
            sub={`${profile?.loginStreak || 0} days`}
            color="text-orange-600"
          />
          <StatCard
            label="Badges Earned"
            value={profile?.badges?.length || 0}
            sub="Achievements"
            color="text-accent-700"
          />
          <StatCard
            label="Pending"
            value={pendingCount}
            sub="assignments due"
            color={pendingCount > 0 ? 'text-red-600' : 'text-emerald-700'}
          />
        </div>

        {/* Active challenges */}
        <div className="mb-6">
          <ActiveChallenges />
        </div>

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming assignments */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-slate-900 font-700">Upcoming Assignments</h3>
              <a href="/student/assignments" className="text-xs text-primary-700 hover:text-primary-300">View all →</a>
            </div>
            {recentAssignments.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No upcoming assignments</p>
            ) : (
              <div className="space-y-2">
                {recentAssignments.map(a => {
                  const deadline = a.deadline?.toDate?.() || new Date(a.deadline)
                  const isNear = (deadline - Date.now()) < 2 * 24 * 60 * 60 * 1000
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 hover:bg-slate-100 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isNear ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.module}</p>
                      </div>
                      <span className={`text-xs flex-shrink-0 ${isNear ? 'text-red-600' : 'text-slate-500'}`}>
                        {deadline.toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Leaderboard mini */}
          <div>
            <Leaderboard maxRows={5} />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
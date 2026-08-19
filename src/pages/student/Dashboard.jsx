import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import ActiveChallenges from '../../components/bage/ActiveChallenges'
import Leaderboard from '../../components/bage/Leaderboard'
import TopPerformers from '../../components/bage/TopPerformers'

function StatCard({ label, value, sub, icon, badge = 'primary', color = 'text-primary-700' }) {
  return (
    <div className="stat-tile">
      <div className={`icon-badge-${badge}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={`text-xl font-display font-700 ${color} leading-tight`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [profile, setProfile]           = useState(null)
  const [recentAssignments, setRecent]  = useState([])
  const [pendingCount, setPending]      = useState(0)
  const [recentGrades, setRecentGrades] = useState([])

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

  // Live-update recent grades — this is what shows lecturer feedback the
  // moment a submission is graded, without the student needing to refresh.
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', user.uid)
    )
    const unsub = onSnapshot(q, async (snap) => {
      const graded = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.grade !== null && s.grade !== undefined)

      if (graded.length === 0) { setRecentGrades([]); return }

      // Attach assignment title/marks for display
      const assignmentIds = [...new Set(graded.map(s => s.assignmentId))]
      const assignmentSnaps = await Promise.all(
        assignmentIds.map(id => getDocs(query(collection(db, 'assignments'), where('__name__', '==', id))))
      )
      const assignmentMap = {}
      assignmentSnaps.forEach(s => s.docs.forEach(d => { assignmentMap[d.id] = d.data() }))

      const withDetails = graded
        .map(s => ({ ...s, assignment: assignmentMap[s.assignmentId] }))
        .sort((a, b) => (b.gradedAt?.toMillis?.() || 0) - (a.gradedAt?.toMillis?.() || 0))
        .slice(0, 5)

      setRecentGrades(withDetails)
    })
    return unsub
  }, [user])


  return (
    <PageLayout>
      <div className="max-w-6xl">
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
            icon="⭐" badge="accent"
            label="Total Points"
            value={(profile?.points || 0).toLocaleString()}
            sub="Keep earning!"
            color="text-accent-700"
          />
          <StatCard
            icon="🔥" badge="red"
            label="Login Streak"
            value={profile?.loginStreak || 0}
            sub={`${profile?.loginStreak || 0} day streak`}
            color="text-orange-600"
          />
          <StatCard
            icon="🏅" badge="purple"
            label="Badges Earned"
            value={profile?.badges?.length || 0}
            sub="Achievements"
            color="text-accent-700"
          />
          <StatCard
            icon={pendingCount > 0 ? '⏰' : '✅'} badge={pendingCount > 0 ? 'red' : 'green'}
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

        {/* Recent grades */}
        {recentGrades.length > 0 && (
          <div className="card mb-6">
            <h3 className="font-display text-slate-900 font-700 mb-4">📝 Recent Grades</h3>
            <div className="space-y-2">
              {recentGrades.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{g.assignment?.title || 'Assignment'}</p>
                    {g.feedback && <p className="text-xs text-slate-500 mt-0.5 truncate">{g.feedback}</p>}
                  </div>
                  <span className="font-display font-700 text-accent-700 text-lg flex-shrink-0">
                    {g.grade}/{g.assignment?.marks ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming assignments */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-slate-900 font-700">Upcoming Assignments</h3>
              <a href="/student/assignments" className="text-xs text-primary-700 hover:text-primary-800">View all →</a>
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

          {/* Leaderboard mini + Top Performers */}
          <div className="space-y-6">
            <Leaderboard maxRows={5} />
            <TopPerformers />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
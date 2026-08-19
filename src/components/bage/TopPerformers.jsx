import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'

const medals = ['🥇', '🥈', '🥉']

// Ranks students in the SAME batch + module by their average assignment
// grade (as a %), not gamification points — a separate, academic-performance
// view of "who's doing best in my cohort/course".
export default function TopPerformers() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [top, setTop] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), s => s.exists() && setProfile(s.data()))
  }, [user])

  useEffect(() => {
    if (!profile) return
    const compute = async () => {
      setLoading(true)
      const [studSnap, subSnap, assignSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'assignments')),
      ])

      // Same batch + module as one combined unit — consistent with every
      // other batch/course scoped view in the app (Leaderboard, Content,
      // Assignments, Calendar, Forum).
      const allStudents = studSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const students = (profile.batch || profile.module)
        ? allStudents.filter(s => s.batch === profile.batch && s.module === profile.module)
        : allStudents

      const studentIds = new Set(students.map(s => s.id))
      const assignmentMarks = {}
      assignSnap.docs.forEach(d => { assignmentMarks[d.id] = d.data().marks || 100 })

      // 2. Graded submissions belonging to students in this cohort
      const graded = subSnap.docs
        .map(d => d.data())
        .filter(s => studentIds.has(s.studentId) && s.grade !== null && s.grade !== undefined)

      // 3. Average % per student
      const totals = {} // studentId -> { sum, count }
      graded.forEach(s => {
        const marks = assignmentMarks[s.assignmentId] || 100
        const pct = (s.grade / marks) * 100
        if (!totals[s.studentId]) totals[s.studentId] = { sum: 0, count: 0 }
        totals[s.studentId].sum += pct
        totals[s.studentId].count += 1
      })

      const ranked = students
        .filter(s => totals[s.id]) // only students with at least one graded submission
        .map(s => ({ ...s, avgPct: totals[s.id].sum / totals[s.id].count, gradedCount: totals[s.id].count }))
        .sort((a, b) => b.avgPct - a.avgPct)
        .slice(0, 3)

      setTop(ranked)
      setLoading(false)
    }
    compute()
  }, [profile])

  if (loading) return null
  if (top.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🎯</span>
        <h3 className="font-display text-slate-900 font-700">Top Performers</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Ranked by average assignment grade · {profile?.batch || 'All'} · {profile?.module || 'All'}
      </p>
      <div className="space-y-2">
        {top.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
              ${s.id === user?.uid ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-100'}`}
          >
            <span className="text-lg w-7 text-center flex-shrink-0">{medals[i]}</span>
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-600 text-primary-700 flex-shrink-0">
              {(s.displayName || s.email)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {s.displayName || s.email?.split('@')[0]}
                {s.id === user?.uid && <span className="text-primary-700 ml-1">(you)</span>}
              </p>
              <p className="text-xs text-slate-500">{s.gradedCount} graded assignment{s.gradedCount !== 1 ? 's' : ''}</p>
            </div>
            <span className="text-sm font-mono font-600 text-accent-700 flex-shrink-0">
              {s.avgPct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
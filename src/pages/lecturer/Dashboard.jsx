import { useEffect, useState } from 'react'
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'

export default function LecturerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, assignments: 0, submissions: 0, ungraded: 0 })
  const [recentSubmissions, setRecent] = useState([])

  useEffect(() => {
    const load = async () => {
      const [studSnap, aSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'submissions')),
      ])
      const ungraded = subSnap.docs.filter(d => d.data().grade === null).length
      setStats({
        students:    studSnap.size,
        assignments: aSnap.size,
        submissions: subSnap.size,
        ungraded,
      })
      // Recent 5 submissions
      const subs = subSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
        .slice(0, 5)
      setRecent(subs)
    }
    load()
  }, [])

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Lecturer Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your modules and student activity.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Students',   value: stats.students,    color: 'text-primary-700' },
            { label: 'Assignments',      value: stats.assignments,  color: 'text-sky-700' },
            { label: 'Submissions',      value: stats.submissions,  color: 'text-emerald-700' },
            { label: 'Awaiting Grade',   value: stats.ungraded,    color: stats.ungraded > 0 ? 'text-accent-700' : 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className="card-sm">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-display font-700 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-display text-slate-900 font-700 mb-4">Recent Submissions</h3>
          {recentSubmissions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No submissions yet</p>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.grade !== null ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 truncate">{s.fileName}</p>
                    <p className="text-xs text-slate-500">{s.studentId?.slice(0, 8)}…</p>
                  </div>
                  <span className={`badge ${s.isOnTime ? 'badge-green' : 'badge-amber'}`}>
                    {s.isOnTime ? 'On time' : 'Late'}
                  </span>
                  <span className={`badge ${s.grade !== null ? 'badge-blue' : 'badge-red'}`}>
                    {s.grade !== null ? `${s.grade} pts` : 'Ungraded'}
                  </span>
                  <a href="/lecturer/assignments" className="text-xs text-primary-700 hover:text-primary-300">Grade →</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
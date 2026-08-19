import { useEffect, useState } from 'react'
import { collection, query, getDocs, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { PageLayout } from '../../components/common/Sidebar'
import GroupedLeaderboards from '../../components/bage/GroupedLeaderboards'

export default function LecturerDashboard() {
  const [stats, setStats] = useState({ students: 0, assignments: 0, submissions: 0, ungraded: 0 })
  const [recentSubmissions, setRecent] = useState([])
  const [studentsByBatch, setStudentsByBatch] = useState({}) // { batchName: [students] }

  useEffect(() => {
    const load = async () => {
      const [studSnap, aSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'submissions')),
      ])
      const students = studSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const studentMap = {}
      students.forEach(s => { studentMap[s.id] = s })

      const ungraded = subSnap.docs.filter(d => d.data().grade === null).length
      setStats({
        students:    students.length,
        assignments: aSnap.size,
        submissions: subSnap.size,
        ungraded,
      })

      // Recent 5 submissions, with real student name attached
      const subs = subSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
        .slice(0, 5)
        .map(s => ({ ...s, student: studentMap[s.studentId] }))
      setRecent(subs)

      // Group students by the COMBINATION of batch + module — "Batch 01 /
      // Computer Basics" is a different group from "Batch 01 / Computer
      // Diploma", even though they share the same batch name.
      const grouped = {}
      students.forEach(s => {
        const batchLabel  = s.batch  || 'Unassigned'
        const moduleLabel = s.module || 'Unassigned'
        const key = `${batchLabel} · ${moduleLabel}`
        if (!grouped[key]) grouped[key] = { batch: batchLabel, module: moduleLabel, students: [] }
        grouped[key].students.push(s)
      })
      setStudentsByBatch(grouped)
    }
    load()
  }, [])

  const batchNames = Object.keys(studentsByBatch).sort((a, b) => {
    const aUnassigned = a.includes('Unassigned')
    const bUnassigned = b.includes('Unassigned')
    if (aUnassigned !== bUnassigned) return aUnassigned ? 1 : -1
    return a.localeCompare(b)
  })

  return (
    <PageLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Lecturer Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your modules and student activity.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Students',   value: stats.students,     color: 'text-primary-700', icon: '🎓', badge: 'primary' },
            { label: 'Assignments',      value: stats.assignments,  color: 'text-sky-700',     icon: '📋', badge: 'sky' },
            { label: 'Submissions',      value: stats.submissions,  color: 'text-emerald-700', icon: '📥', badge: 'green' },
            { label: 'Awaiting Grade',   value: stats.ungraded,     color: stats.ungraded > 0 ? 'text-accent-700' : 'text-emerald-700', icon: stats.ungraded > 0 ? '✏️' : '✅', badge: stats.ungraded > 0 ? 'accent' : 'green' },
          ].map(s => (
            <div key={s.label} className="stat-tile">
              <div className={`icon-badge-${s.badge}`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
                <p className={`text-xl font-display font-700 ${s.color} leading-tight`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card mb-6">
          <h3 className="font-display text-slate-900 font-700 mb-4">Recent Submissions</h3>
          {recentSubmissions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No submissions yet</p>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.grade !== null ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 truncate">
                      {s.student?.displayName || s.student?.email || `${s.studentId?.slice(0, 8)}…`}
                      {s.student?.batch && <span className="badge badge-amber ml-2">{s.student.batch}</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{s.fileName}</p>
                  </div>
                  <span className={`badge ${s.isOnTime ? 'badge-green' : 'badge-amber'}`}>
                    {s.isOnTime ? 'On time' : 'Late'}
                  </span>
                  <span className={`badge ${s.grade !== null ? 'badge-blue' : 'badge-red'}`}>
                    {s.grade !== null ? `${s.grade} pts` : 'Ungraded'}
                  </span>
                  <a href="/lecturer/assignments" className="text-xs text-primary-700 hover:text-primary-800">Grade →</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students grouped by batch */}
        <div className="card mb-6">
          <h3 className="font-display text-slate-900 font-700 mb-4">Students by Batch</h3>
          {batchNames.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No students yet</p>
          ) : (
            <div className="space-y-5">
              {batchNames.map(key => {
                const group = studentsByBatch[key]
                const isUnassigned = key.includes('Unassigned')
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={isUnassigned ? 'badge badge-red' : 'badge badge-amber'}>{group.batch}</span>
                      <span className={isUnassigned ? 'badge badge-red' : 'badge badge-blue'}>{group.module}</span>
                      <span className="text-xs text-slate-500">{group.students.length} student{group.students.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.students.map(s => (
                        <span key={s.id} className="badge badge-blue">
                          {s.displayName || s.email}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <GroupedLeaderboards maxPerGroup={5} />
      </div>
    </PageLayout>
  )
}
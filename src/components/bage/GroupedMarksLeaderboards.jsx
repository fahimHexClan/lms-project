import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'

const medals = ['🥇', '🥈', '🥉']

// Admin/Lecturer view — one "Total Marks" leaderboard card per Batch+Course
// group, ranking students by their COMBINED average % across graded
// assignments AND exam results (real academic marks, not gamification
// points). Shows the top 5 per group.
export default function GroupedMarksLeaderboards({ maxPerGroup = 5 }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [studSnap, subSnap, assignSnap, examResultSnap, examSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'examResults')),
        getDocs(collection(db, 'exams')),
      ])

      const students = studSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const assignmentMarks = {}
      assignSnap.docs.forEach(d => { assignmentMarks[d.id] = d.data().marks || 100 })
      const examMarks = {}
      examSnap.docs.forEach(d => { examMarks[d.id] = d.data().totalMarks || 100 })

      const graded = subSnap.docs.map(d => d.data()).filter(s => s.grade !== null && s.grade !== undefined)
      const examResults = examResultSnap.docs.map(d => d.data())

      const totals = {} // studentId -> { sum, count }
      graded.forEach(s => {
        const marks = assignmentMarks[s.assignmentId] || 100
        const pct = (s.grade / marks) * 100
        if (!totals[s.studentId]) totals[s.studentId] = { sum: 0, count: 0 }
        totals[s.studentId].sum += pct
        totals[s.studentId].count += 1
      })
      examResults.forEach(r => {
        const marks = examMarks[r.examId] || 100
        const pct = (r.marks / marks) * 100
        if (!totals[r.studentId]) totals[r.studentId] = { sum: 0, count: 0 }
        totals[r.studentId].sum += pct
        totals[r.studentId].count += 1
      })

      const ranked = students
        .filter(s => totals[s.id])
        .map(s => ({ ...s, avgPct: totals[s.id].sum / totals[s.id].count, gradedCount: totals[s.id].count }))

      setRows(ranked)
      setLoading(false)
    }
    load()
  }, [])

  // Group by batch + module combined key
  const groups = {}
  rows.forEach(s => {
    const batch  = s.batch  || 'Unassigned'
    const module = s.module || 'Unassigned'
    const key = `${batch} · ${module}`
    if (!groups[key]) groups[key] = { batch, module, students: [] }
    groups[key].students.push(s)
  })
  Object.values(groups).forEach(g => g.students.sort((a, b) => b.avgPct - a.avgPct))

  const groupKeys = Object.keys(groups).sort((a, b) => {
    const aUn = a.includes('Unassigned'), bUn = b.includes('Unassigned')
    if (aUn !== bUn) return aUn ? 1 : -1
    return a.localeCompare(b)
  })

  if (loading) return null

  if (groupKeys.length === 0) {
    return (
      <div className="card">
        <h3 className="font-display text-slate-900 font-700 mb-1">📈 Total Marks by Batch &amp; Course</h3>
        <p className="text-slate-500 text-sm text-center py-6">No graded assignments or exams yet</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-display text-slate-900 font-700 mb-1">📈 Total Marks by Batch &amp; Course</h3>
      <p className="text-xs text-slate-500 mb-4">Ranked by combined average across graded assignments + exam results</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupKeys.map(key => {
          const group = groups[key]
          const isUnassigned = key.includes('Unassigned')
          return (
            <div key={key} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={isUnassigned ? 'badge badge-red' : 'badge badge-amber'}>{group.batch}</span>
                <span className={isUnassigned ? 'badge badge-red' : 'badge badge-blue'}>{group.module}</span>
              </div>
              <div className="space-y-1.5">
                {group.students.slice(0, maxPerGroup).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 py-1">
                    <span className="w-5 text-center text-sm flex-shrink-0">
                      {medals[i] || <span className="text-slate-400 text-xs font-mono">{i + 1}</span>}
                    </span>
                    <span className="text-sm text-slate-700 truncate flex-1">
                      {s.displayName || s.email?.split('@')[0]}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{s.gradedCount} item{s.gradedCount !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-mono font-600 text-accent-700 flex-shrink-0">
                      {s.avgPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
                {group.students.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No graded items yet</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'

const medals = ['🥇', '🥈', '🥉']

// Admin/Lecturer view — one leaderboard card per Batch+Course group, so
// staff can see rankings organized by cohort/course rather than one giant
// mixed list. Students with no batch/module land in an "Unassigned" group.
export default function GroupedLeaderboards({ maxPerGroup = 5 }) {
  const [students, setStudents] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'), orderBy('points', 'desc'))
    return onSnapshot(q, snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => {
      console.error('Grouped leaderboard query failed (likely a missing Firestore index):', err)
    })
  }, [])

  const groups = {}
  students.forEach(s => {
    const batch  = s.batch  || 'Unassigned'
    const module = s.module || 'Unassigned'
    const key = `${batch} · ${module}`
    if (!groups[key]) groups[key] = { batch, module, students: [] }
    groups[key].students.push(s)
  })

  const groupKeys = Object.keys(groups).sort((a, b) => {
    const aUn = a.includes('Unassigned'), bUn = b.includes('Unassigned')
    if (aUn !== bUn) return aUn ? 1 : -1
    return a.localeCompare(b)
  })

  if (groupKeys.length === 0) {
    return (
      <div className="card">
        <h3 className="font-display text-slate-900 font-700 mb-1">🏆 Leaderboards by Batch &amp; Course</h3>
        <p className="text-slate-500 text-sm text-center py-6">No students yet</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-display text-slate-900 font-700 mb-4">🏆 Leaderboards by Batch &amp; Course</h3>
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
                    <span className="text-xs font-mono font-600 text-accent-700 flex-shrink-0">
                      {(s.points || 0).toLocaleString()} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
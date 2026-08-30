import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, where, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'

export default function StudentExams() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [exams, setExams] = useState([])
  const [results, setResults] = useState({}) // { examId: marks }

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), s => s.exists() && setProfile(s.data()))
  }, [user])

  useEffect(() => {
    const q = query(collection(db, 'exams'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setExams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'examResults'), where('studentId', '==', user.uid))
    return onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.data().examId] = d.data().marks })
      setResults(map)
    })
  }, [user])

  // Same batch+module visibility rule used everywhere in the app.
  // Exams always require both fields (no broadcast option), so this is a
  // straightforward exact match.
  const visible = exams.filter(e => e.batch === profile?.batch && e.module === profile?.module)

  return (
    <PageLayout>
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Online Exams</h1>
          <p className="text-slate-500 mt-1">Your exam results, as entered by your lecturer.</p>
        </div>

        <div className="space-y-4">
          {visible.map(ex => {
            const marks = results[ex.id]
            return (
              <div key={ex.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{ex.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{ex.batch} · {ex.module} · {ex.date}</p>
                  </div>
                  {marks !== undefined ? (
                    <span className="font-display font-700 text-accent-700 text-xl">
                      {marks}/{ex.totalMarks}
                    </span>
                  ) : (
                    <span className="badge badge-amber">Not yet graded</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">📝</p>
            <p>No exams scheduled for your batch/module yet.</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
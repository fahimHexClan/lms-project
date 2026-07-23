import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, getDocs, where
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import toast from 'react-hot-toast'

export default function LecturerAssignments() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [selected, setSelected]       = useState(null) // assignment being graded
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm] = useState({ title: '', module: '', description: '', deadline: '', marks: 100 })
  const [creating, setCreating]       = useState(false)
  const [gradingId, setGradingId]     = useState(null)
  const [gradeInputs, setGradeInputs] = useState({}) // { subId: { grade, feedback } }

  useEffect(() => {
    const q = query(collection(db, 'assignments'), orderBy('deadline', 'asc'))
    return onSnapshot(q, snap => setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const loadSubmissions = async (assignmentId) => {
    const snap = await getDocs(
      query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId))
    )
    setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setSelected(assignmentId)
  }

  const createAssignment = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await addDoc(collection(db, 'assignments'), {
        title:       form.title.trim(),
        module:      form.module.trim(),
        description: form.description.trim(),
        deadline:    new Date(form.deadline),
        marks:       Number(form.marks),
        createdBy:   user.uid,
        createdAt:   serverTimestamp(),
      })
      setForm({ title: '', module: '', description: '', deadline: '', marks: 100 })
      setShowForm(false)
      toast.success('Assignment created!')
    } catch {
      toast.error('Failed to create assignment.')
    } finally {
      setCreating(false)
    }
  }

  const submitGrade = async (sub) => {
    const input = gradeInputs[sub.id]
    if (!input?.grade) return
    setGradingId(sub.id)
    try {
      await updateDoc(doc(db, 'submissions', sub.id), {
        grade:    Number(input.grade),
        feedback: input.feedback || '',
        gradedAt: serverTimestamp(),
        gradedBy: user.uid,
      })
      toast.success('Grade submitted!')
      // Refresh
      await loadSubmissions(selected)
    } catch {
      toast.error('Failed to submit grade.')
    } finally {
      setGradingId(null)
    }
  }

  const selectedAssignment = assignments.find(a => a.id === selected)

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">Assignments</h1>
            <p className="text-slate-500 mt-1">Create assignments and grade student submissions.</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary">+ New Assignment</button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={createAssignment} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">Create new assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="Assignment title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Module</label>
                <input className="input" placeholder="e.g. COM6301"
                  value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} />
              </div>
              <div>
                <label className="label">Deadline *</label>
                <input type="datetime-local" className="input"
                  value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Total Marks</label>
                <input type="number" className="input" min={1} max={1000}
                  value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))} />
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} placeholder="Assignment brief…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create Assignment'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Assignment list */}
          <div className="lg:col-span-2 space-y-2">
            {assignments.map(a => {
              const deadline = a.deadline?.toDate?.() || new Date(a.deadline)
              const isPast   = deadline < new Date()
              return (
                <button
                  key={a.id}
                  onClick={() => loadSubmissions(a.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all
                    ${selected === a.id
                      ? 'border-primary-700 bg-primary-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <p className="text-sm font-medium text-slate-700 mb-1">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.module} • {a.marks} marks</p>
                  <p className={`text-xs mt-1 ${isPast ? 'text-red-600' : 'text-slate-500'}`}>
                    {isPast ? '⏰ Closed' : '🟢 Open'} · {deadline.toLocaleDateString()}
                  </p>
                </button>
              )
            })}
            {assignments.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">No assignments yet</p>
              </div>
            )}
          </div>

          {/* Submissions panel */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="card">
                <h3 className="font-display text-slate-900 font-700 mb-1">{selectedAssignment?.title}</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {submissions.length} submission{submissions.length !== 1 ? 's' : ''} •
                  {' '}{submissions.filter(s => s.grade !== null).length} graded
                </p>

                {submissions.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-4">
                    {submissions.map(sub => (
                      <div key={sub.id} className="border border-slate-200 rounded-xl p-4 bg-slate-100/30">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm text-slate-600">{sub.studentId?.slice(0, 12)}…</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`badge ${sub.isOnTime ? 'badge-green' : 'badge-amber'}`}>
                                {sub.isOnTime ? '✓ On time' : '⚠ Late'}
                              </span>
                              <a href={sub.fileUrl} target="_blank" rel="noreferrer"
                                className="text-xs text-primary-700 hover:text-primary-300">
                                📎 {sub.fileName}
                              </a>
                            </div>
                          </div>
                          {sub.grade !== null && (
                            <div className="text-right">
                              <p className="font-display font-700 text-accent-700 text-xl">
                                {sub.grade}/{selectedAssignment?.marks}
                              </p>
                            </div>
                          )}
                        </div>

                        {sub.grade !== null ? (
                          <div className="bg-slate-100 rounded-lg p-2 text-xs text-slate-500">
                            <span className="text-slate-500">Feedback: </span>{sub.feedback || 'No feedback provided'}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="number" min={0} max={selectedAssignment?.marks}
                                className="input w-24 text-sm"
                                placeholder={`/ ${selectedAssignment?.marks}`}
                                value={gradeInputs[sub.id]?.grade || ''}
                                onChange={e => setGradeInputs(g => ({
                                  ...g, [sub.id]: { ...g[sub.id], grade: e.target.value }
                                }))}
                              />
                              <input
                                className="input flex-1 text-sm"
                                placeholder="Written feedback…"
                                value={gradeInputs[sub.id]?.feedback || ''}
                                onChange={e => setGradeInputs(g => ({
                                  ...g, [sub.id]: { ...g[sub.id], feedback: e.target.value }
                                }))}
                              />
                              <button
                                onClick={() => submitGrade(sub)}
                                disabled={gradingId === sub.id || !gradeInputs[sub.id]?.grade}
                                className="btn-primary text-sm px-4 flex-shrink-0"
                              >
                                {gradingId === sub.id ? '…' : 'Grade'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card flex items-center justify-center min-h-[300px]">
                <div className="text-center text-slate-500">
                  <p className="text-4xl mb-3">📋</p>
                  <p>Select an assignment to view submissions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
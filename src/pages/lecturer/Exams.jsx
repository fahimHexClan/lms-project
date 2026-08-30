import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, where, getDocs, setDoc
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { useLookups } from '../../hooks/useLookups'
import { PageLayout } from '../../components/common/Sidebar'
import toast from 'react-hot-toast'

const emptyForm = { title: '', totalMarks: 100, date: '', module: '', batch: '' }

export default function LecturerExams() {
  const { user } = useAuth()
  const { batches, coursesForBatch } = useLookups()
  const [exams, setExams] = useState([])
  const [students, setStudents] = useState([])
  const [results, setResults] = useState({}) // { studentId: { id, marks } }
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [marksInput, setMarksInput] = useState({}) // { studentId: value }
  const [savingMarks, setSavingMarks] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'exams'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setExams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const selectedExam = exams.find(e => e.id === selected)

  // Load matching students (by the exam's batch/module) + their existing results
  useEffect(() => {
    if (!selectedExam) return
    const loadStudents = async () => {
      let q = query(collection(db, 'users'), where('role', '==', 'student'))
      const snap = await getDocs(q)
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Filter to the exam's batch/module (same combined-key rule as everywhere else)
      if (selectedExam.batch || selectedExam.module) {
        all = all.filter(s => s.batch === selectedExam.batch && s.module === selectedExam.module)
      }
      setStudents(all)
    }
    loadStudents()

    const resQ = query(collection(db, 'examResults'), where('examId', '==', selectedExam.id))
    const unsub = onSnapshot(resQ, snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.data().studentId] = { id: d.id, ...d.data() } })
      setResults(map)
    })
    return unsub
  }, [selectedExam?.id])

  const createExam = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await addDoc(collection(db, 'exams'), {
        title: form.title.trim(),
        totalMarks: Number(form.totalMarks),
        date: form.date,
        module: form.module.trim(),
        batch: form.batch.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      setForm(emptyForm)
      setShowForm(false)
      toast.success('Exam created!')
    } catch {
      toast.error('Failed to create exam.')
    } finally {
      setSaving(false)
    }
  }

  const deleteExam = async (exam) => {
    if (!confirm(`Delete "${exam.title}"? All entered marks for it will remain orphaned.`)) return
    await deleteDoc(doc(db, 'exams', exam.id))
    if (selected === exam.id) setSelected(null)
    toast.success('Exam deleted.')
  }

  const saveMark = async (studentId) => {
    const value = marksInput[studentId]
    if (value === undefined || value === '') return
    const marks = Number(value)
    if (marks < 0 || marks > selectedExam.totalMarks) {
      toast.error(`Marks must be between 0 and ${selectedExam.totalMarks}.`)
      return
    }
    setSavingMarks(studentId)
    try {
      const resultId = `${selectedExam.id}_${studentId}`
      await setDoc(doc(db, 'examResults', resultId), {
        examId: selectedExam.id,
        studentId,
        marks,
        gradedBy: user.uid,
        gradedAt: serverTimestamp(),
      })
      toast.success('Marks saved!')
    } catch {
      toast.error('Failed to save marks.')
    } finally {
      setSavingMarks(null)
    }
  }

  return (
    <PageLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">Online Exams</h1>
            <p className="text-slate-500 mt-1">Create exams and enter marks for each student.</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary">+ New Exam</button>
        </div>

        {showForm && (
          <form onSubmit={createExam} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">Create new exam</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="label">Exam Title *</label>
                <input className="input" placeholder="Mid-Term Online Exam"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Total Marks</label>
                <input type="number" className="input" min={1}
                  value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} />
              </div>
              <div>
                <label className="label">Batch *</label>
                <select className="input" value={form.batch} required
                  onChange={e => setForm(f => ({ ...f, batch: e.target.value, module: '' }))}>
                  <option value="">Select batch…</option>
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Module *</label>
                <select className="input" value={form.module} required
                  onChange={e => setForm(f => ({ ...f, module: e.target.value }))}>
                  <option value="">Select module…</option>
                  {coursesForBatch(form.batch).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2 mb-4">
              Batch + Module are required for exams — marks entry needs a defined student list to work against.
            </p>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Exam'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {exams.map(ex => (
              <div key={ex.id}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer
                  ${selected === ex.id ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                onClick={() => setSelected(ex.id)}
              >
                <p className="text-sm font-medium text-slate-700 mb-1">{ex.title}</p>
                <p className="text-xs text-slate-500">{ex.batch} · {ex.module} · {ex.totalMarks} marks</p>
                <p className="text-xs text-slate-500 mt-1">{ex.date}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteExam(ex) }}
                  className="text-xs text-red-600 hover:text-red-700 mt-2"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
            {exams.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-3xl mb-2">📝</p>
                <p className="text-sm">No exams yet</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            {selectedExam ? (
              <div className="card">
                <h3 className="font-display text-slate-900 font-700 mb-1">{selectedExam.title}</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {selectedExam.batch} · {selectedExam.module} · out of {selectedExam.totalMarks} marks
                </p>
                {students.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No students found for this batch/module.</p>
                ) : (
                  <div className="space-y-2">
                    {students.map(s => {
                      const existing = results[s.id]
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{s.displayName || s.email}</p>
                          </div>
                          <input
                            type="number" min={0} max={selectedExam.totalMarks}
                            className="input w-24 text-sm"
                            placeholder={existing ? String(existing.marks) : `/ ${selectedExam.totalMarks}`}
                            value={marksInput[s.id] ?? (existing?.marks ?? '')}
                            onChange={e => setMarksInput(m => ({ ...m, [s.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => saveMark(s.id)}
                            disabled={savingMarks === s.id}
                            className="btn-primary text-sm px-4 flex-shrink-0"
                          >
                            {savingMarks === s.id ? '…' : existing ? 'Update' : 'Save'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="card flex items-center justify-center min-h-[300px]">
                <div className="text-center text-slate-500">
                  <p className="text-4xl mb-3">📝</p>
                  <p>Select an exam to enter marks</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
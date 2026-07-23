import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import toast from 'react-hot-toast'

export default function StudentAssignments() {
  const { user } = useAuth()
  const [assignments, setAssignments]   = useState([])
  const [submissions, setSubmissions]   = useState({})
  const [uploading, setUploading]       = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'assignments'), orderBy('deadline', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'submissions'), where('studentId', '==', user.uid))
    const unsub = onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.data().assignmentId] = { id: d.id, ...d.data() } })
      setSubmissions(map)
    })
    return unsub
  }, [user])

  const handleSubmit = async (assignment, file) => {
    if (!file) return
    setUploading(assignment.id)
    try {
      // Upload file to Storage
      const path = `submissions/${user.uid}/${assignment.id}/${file.name}`
      const snap = await uploadBytes(ref(storage, path), file)
      const url  = await getDownloadURL(snap.ref)

      const now      = new Date()
      const deadline = assignment.deadline?.toDate?.() || new Date(assignment.deadline)
      const isOnTime = now <= deadline

      // Save submission to Firestore
      await addDoc(collection(db, 'submissions'), {
        assignmentId: assignment.id,
        studentId:    user.uid,
        fileUrl:      url,
        storagePath:  path,
        fileName:     file.name,
        isOnTime,
        grade:        null,
        feedback:     null,
        submittedAt:  serverTimestamp(),
      })

      // Update behaviour doc for BAGE engine
      const behaviourRef = doc(db, 'userBehaviour', user.uid)
      if (isOnTime) {
        await updateDoc(behaviourRef, {
          onTimeSubmissions: increment(1),
          lateSubmissions:   0,
          updatedAt:         serverTimestamp(),
        })
      } else {
        await updateDoc(behaviourRef, {
          lateSubmissions:   increment(1),
          updatedAt:         serverTimestamp(),
        })
      }

      // Base points for submitting
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(isOnTime ? 15 : 5),
      })

      toast.success(isOnTime ? '✅ Submitted on time! +15 pts' : '⚠️ Submitted late. +5 pts')
    } catch (err) {
      toast.error('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(null)
    }
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Assignments</h1>
          <p className="text-slate-500 mt-1">Submit your coursework and view feedback.</p>
        </div>

        <div className="space-y-4">
          {assignments.map(a => {
            const sub      = submissions[a.id]
            const deadline = a.deadline?.toDate?.() || new Date(a.deadline)
            const isPast   = deadline < new Date()
            const isNear   = !isPast && (deadline - Date.now()) < 2 * 24 * 60 * 60 * 1000

            return (
              <AssignmentCard
                key={a.id}
                assignment={a}
                submission={sub}
                deadline={deadline}
                isPast={isPast}
                isNear={isNear}
                uploading={uploading === a.id}
                onSubmit={(file) => handleSubmit(a, file)}
              />
            )
          })}
          {assignments.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-4xl mb-3">📋</p>
              <p>No assignments yet</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

function AssignmentCard({ assignment: a, submission, deadline, isPast, isNear, uploading, onSubmit }) {
  const [file, setFile] = useState(null)

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-900">{a.title}</h3>
            {submission && (
              <span className={`badge ${submission.isOnTime ? 'badge-green' : 'badge-amber'}`}>
                {submission.isOnTime ? '✓ On time' : '⚠ Late'}
              </span>
            )}
            {!submission && isPast && <span className="badge badge-red">❌ Missed</span>}
            {!submission && isNear && <span className="badge badge-amber">⏰ Due soon</span>}
          </div>
          <p className="text-sm text-slate-500 mb-1">{a.module} • {a.marks} marks</p>
          <p className="text-sm text-slate-500">{a.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">Deadline</p>
          <p className={`text-sm font-medium ${isPast ? 'text-red-600' : isNear ? 'text-accent-700' : 'text-slate-600'}`}>
            {deadline.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Submission area */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        {submission ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Your submission</p>
              <a href={submission.fileUrl} target="_blank" rel="noreferrer"
                className="text-sm text-primary-700 hover:text-primary-300 underline underline-offset-2">
                {submission.fileName}
              </a>
            </div>
            {submission.grade !== null ? (
              <div className="text-right">
                <p className="text-xs text-slate-500">Grade</p>
                <p className="text-xl font-display font-700 text-accent-700">{submission.grade} / {a.marks}</p>
                {submission.feedback && (
                  <p className="text-xs text-slate-500 mt-1 max-w-xs text-right">{submission.feedback}</p>
                )}
              </div>
            ) : (
              <span className="badge badge-blue">Awaiting grade</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.zip"
              id={`file-${a.id}`}
              className="hidden"
              onChange={e => setFile(e.target.files[0])}
            />
            <label htmlFor={`file-${a.id}`} className="btn-secondary text-sm cursor-pointer">
              {file ? `📎 ${file.name}` : 'Choose file'}
            </label>
            {file && (
              <button
                onClick={() => onSubmit(file)}
                disabled={uploading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {uploading ? (
                  <><span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> Uploading…</>
                ) : 'Submit'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
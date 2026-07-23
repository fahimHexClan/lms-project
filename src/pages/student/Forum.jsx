import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, updateDoc, increment, where, getDocs
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const roleBadge = { student: 'badge-blue', lecturer: 'badge-amber', admin: 'badge-green' }
const roleAvatar = {
  student:  'bg-primary-50 text-primary-700',
  lecturer: 'bg-accent-100 text-accent-700',
  admin:    'bg-emerald-50 text-emerald-700',
}

export default function ForumPage() {
  const { user, role } = useAuth()
  const [threads, setThreads]         = useState([])
  const [selected, setSelected]       = useState(null)
  const [replies, setReplies]         = useState([])
  const [newTitle, setNewTitle]       = useState('')
  const [newBody, setNewBody]         = useState('')
  const [newFile, setNewFile]         = useState(null)
  const [replyBody, setReplyBody]     = useState('')
  const [replyFile, setReplyFile]     = useState(null)
  const [showForm, setShowForm]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  // Load threads
  useEffect(() => {
    const q = query(collection(db, 'forumThreads'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  // Load replies for selected thread
  useEffect(() => {
    if (!selected) return
    const q = query(
      collection(db, 'forumReplies'),
      where('threadId', '==', selected.id),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, snap => setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [selected])

  const uploadAttachment = async (file, folder) => {
    const path = `forum/${folder}/${user.uid}/${Date.now()}_${file.name}`
    const snap = await uploadBytes(ref(storage, path), file)
    const url  = await getDownloadURL(snap.ref)
    return { fileUrl: url, fileName: file.name, storagePath: path }
  }

  const createThread = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSubmitting(true)
    try {
      let attachment = {}
      if (newFile) attachment = await uploadAttachment(newFile, 'threads')

      await addDoc(collection(db, 'forumThreads'), {
        title:         newTitle.trim(),
        body:          newBody.trim(),
        authorId:      user.uid,
        authorEmail:   user.email,
        role,
        replyCount:    0,
        fileUrl:       attachment.fileUrl     || null,
        fileName:      attachment.fileName    || null,
        storagePath:   attachment.storagePath || null,
        createdAt:     serverTimestamp(),
      })
      // Award points + update behaviour
      await updateDoc(doc(db, 'users', user.uid), { points: increment(5) })
      if (role === 'student') {
        await updateDoc(doc(db, 'userBehaviour', user.uid), {
          forumPostsThisWeek: increment(1),
          lastPostDate:       serverTimestamp(),
          daysSinceLastPost:  0,
          updatedAt:          serverTimestamp(),
        })
      }
      setNewTitle('')
      setNewBody('')
      setNewFile(null)
      setShowForm(false)
      toast.success('Thread posted! +5 pts')
    } catch (err) {
      toast.error('Failed to post thread.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const postReply = async (e) => {
    e.preventDefault()
    if ((!replyBody.trim() && !replyFile) || !selected) return
    setSubmitting(true)
    try {
      let attachment = {}
      if (replyFile) attachment = await uploadAttachment(replyFile, 'replies')

      await addDoc(collection(db, 'forumReplies'), {
        threadId:    selected.id,
        body:        replyBody.trim(),
        authorId:    user.uid,
        authorEmail: user.email,
        role,
        fileUrl:     attachment.fileUrl     || null,
        fileName:    attachment.fileName    || null,
        storagePath: attachment.storagePath || null,
        createdAt:   serverTimestamp(),
      })
      await updateDoc(doc(db, 'forumThreads', selected.id), {
        replyCount: increment(1),
      })
      await updateDoc(doc(db, 'users', user.uid), { points: increment(3) })
      if (role === 'student') {
        await updateDoc(doc(db, 'userBehaviour', user.uid), {
          forumPostsThisWeek: increment(1),
          daysSinceLastPost:  0,
          updatedAt:          serverTimestamp(),
        })
      }
      setReplyBody('')
      setReplyFile(null)
      toast.success('Reply posted! +3 pts')
    } catch (err) {
      toast.error('Failed to post reply.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">Discussion Forum</h1>
            <p className="text-slate-500 mt-1">Ask questions, share knowledge, collaborate.</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary">
            + New Thread
          </button>
        </div>

        {/* New thread form */}
        {showForm && (
          <form onSubmit={createThread} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">Create a new thread</h3>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Thread title…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required
              />
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="Describe your question or topic…"
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
              />
              <div>
                <label className="label">Attach a file (optional)</label>
                <input type="file"
                  className="block text-sm text-slate-500 file:mr-3 file:btn-secondary file:border-0 file:text-xs file:cursor-pointer"
                  onChange={e => setNewFile(e.target.files[0])} />
                {newFile && <p className="text-xs text-slate-500 mt-1">📎 {newFile.name} ({(newFile.size / 1024).toFixed(0)} KB)</p>}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                  {submitting ? <><span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> Posting…</> : 'Post Thread'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Thread list */}
          <div className="lg:col-span-2 space-y-2">
            {threads.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left p-4 rounded-xl border transition-all
                  ${selected?.id === t.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-700 line-clamp-2">
                    {t.fileUrl && <span className="mr-1">📎</span>}{t.title}
                  </p>
                  <span className={`badge flex-shrink-0 ${roleBadge[t.role] || 'badge-blue'}`}>
                    {t.role}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{t.authorEmail?.split('@')[0]}</span>
                  <span>•</span>
                  <span>💬 {t.replyCount || 0}</span>
                  <span>•</span>
                  <span>{t.createdAt?.toDate ? formatDistanceToNow(t.createdAt.toDate(), { addSuffix: true }) : '—'}</span>
                </div>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm">No threads yet. Start a discussion!</p>
              </div>
            )}
          </div>

          {/* Thread detail + replies */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="card">
                <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-slate-600 mb-4">
                  ← Back to threads
                </button>
                <h2 className="font-display text-xl font-700 text-slate-900 mb-1">{selected.title}</h2>
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                  <span className={`badge ${roleBadge[selected.role] || 'badge-blue'}`}>{selected.role}</span>
                  <span>{selected.authorEmail?.split('@')[0]}</span>
                  <span>•</span>
                  <span>{selected.createdAt?.toDate ? formatDistanceToNow(selected.createdAt.toDate(), { addSuffix: true }) : '—'}</span>
                </div>
                {selected.body && <p className="text-slate-600 text-sm mb-3 leading-relaxed">{selected.body}</p>}
                {selected.fileUrl && (
                  <a href={selected.fileUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 underline underline-offset-2 mb-6">
                    📎 {selected.fileName}
                  </a>
                )}

                {/* Replies */}
                <div className="space-y-3 mb-6 mt-4">
                  {replies.map(r => (
                    <div key={r.id} className="flex gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-600 flex-shrink-0 mt-0.5
                        ${roleAvatar[r.role] || roleAvatar.student}`}>
                        {r.authorEmail?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-600">{r.authorEmail?.split('@')[0]}</span>
                          <span className={`badge ${roleBadge[r.role] || 'badge-blue'}`}>{r.role}</span>
                          <span className="text-xs text-slate-500 ml-auto">
                            {r.createdAt?.toDate ? formatDistanceToNow(r.createdAt.toDate(), { addSuffix: true }) : '—'}
                          </span>
                        </div>
                        {r.body && <p className="text-sm text-slate-600">{r.body}</p>}
                        {r.fileUrl && (
                          <a href={r.fileUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 underline underline-offset-2 mt-1">
                            📎 {r.fileName}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply form */}
                <form onSubmit={postReply} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Write a reply…"
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                    />
                    <button type="submit" disabled={submitting || (!replyBody.trim() && !replyFile)} className="btn-primary flex-shrink-0">
                      {submitting ? '…' : 'Reply'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="file" id="reply-file"
                      className="hidden"
                      onChange={e => setReplyFile(e.target.files[0])} />
                    <label htmlFor="reply-file" className="text-xs text-slate-500 hover:text-slate-600 cursor-pointer underline underline-offset-2">
                      {replyFile ? `📎 ${replyFile.name}` : '+ Attach a file'}
                    </label>
                    {replyFile && (
                      <button type="button" onClick={() => setReplyFile(null)} className="text-xs text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <div className="card flex items-center justify-center min-h-[300px]">
                <div className="text-center text-slate-500">
                  <p className="text-4xl mb-3">💬</p>
                  <p>Select a thread to read and reply</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
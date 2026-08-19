import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc,
  addDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { useLookups } from '../../hooks/useLookups'
import { PageLayout } from '../../components/common/Sidebar'
import toast from 'react-hot-toast'

const emptyForm = { displayName: '', email: '', password: '', role: 'student', batch: '', module: '' }
const roleBadge = { student: 'badge-purple', lecturer: 'badge-amber', admin: 'badge-green' }

export default function AdminUsers() {
  const { register } = useAuth()
  const { batches, courses, offerings, coursesForBatch } = useLookups()
  const [users, setUsers]         = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [creating, setCreating]   = useState(false)
  const [filter, setFilter]       = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm]   = useState({ displayName: '', role: 'student', batch: '', module: '' })
  const [saving, setSaving]       = useState(false)
  const [showLookups, setShowLookups] = useState(false)

  // Batch/Course name management
  const [newBatch, setNewBatch]   = useState('')
  const [newCourse, setNewCourse] = useState('')
  const [renameTarget, setRenameTarget] = useState(null) // { kind: 'batch'|'course', id, name }
  const [renameValue, setRenameValue]   = useState('')

  // Offering (Batch <-> Course pairing) form
  const [offerBatch, setOfferBatch]   = useState('')
  const [offerCourse, setOfferCourse] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter)

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await register(form.email, form.password, form.role, form.displayName, form.batch, form.module)
      setForm(emptyForm)
      setShowForm(false)
      toast.success(`${form.role} account created!`)
    } catch (err) {
      toast.error(err.message || 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete account for ${u.email}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'users', u.id))
      toast.success('User removed from Firestore. Auth account requires Admin SDK to fully delete.')
    } catch {
      toast.error('Failed to delete user.')
    }
  }

  const startEdit = (u) => {
    setEditingUser(u)
    setEditForm({
      displayName: u.displayName || '',
      role:        u.role || 'student',
      batch:       u.batch || '',
      module:      u.module || '',
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: editForm.displayName.trim(),
        role:        editForm.role,
        batch:       editForm.batch.trim(),
        module:      editForm.module.trim(),
      })
      toast.success('User updated!')
      setEditingUser(null)
    } catch {
      toast.error('Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  // ── Batch / Course name management ──────────────────────────────────────
  const addBatch = async () => {
    if (!newBatch.trim()) return
    if (batches.some(b => b.name.toLowerCase() === newBatch.trim().toLowerCase())) {
      toast.error('That batch already exists.'); return
    }
    await addDoc(collection(db, 'batches'), { name: newBatch.trim(), createdAt: serverTimestamp() })
    setNewBatch('')
    toast.success('Batch added!')
  }
  const addCourse = async () => {
    if (!newCourse.trim()) return
    if (courses.some(c => c.name.toLowerCase() === newCourse.trim().toLowerCase())) {
      toast.error('That course already exists.'); return
    }
    await addDoc(collection(db, 'courses'), { name: newCourse.trim(), createdAt: serverTimestamp() })
    setNewCourse('')
    toast.success('Course added!')
  }
  const removeBatch = async (id) => { await deleteDoc(doc(db, 'batches', id)) }
  const removeCourse = async (id) => { await deleteDoc(doc(db, 'courses', id)) }

  const startRename = (kind, item) => {
    setRenameTarget({ kind, id: item.id, name: item.name })
    setRenameValue(item.name)
  }
  const saveRename = async () => {
    if (!renameValue.trim()) return
    const col = renameTarget.kind === 'batch' ? 'batches' : 'courses'
    await updateDoc(doc(db, col, renameTarget.id), { name: renameValue.trim() })
    toast.success('Renamed! Note: existing users/content already tagged with the old name will need to be re-saved to pick up the new name.')
    setRenameTarget(null)
  }

  // ── Offerings (Batch <-> Course pairing) ────────────────────────────────
  const addOffering = async () => {
    if (!offerBatch || !offerCourse) {
      toast.error('Select both a batch and a course.'); return
    }
    if (offerings.some(o => o.batch === offerBatch && o.course === offerCourse)) {
      toast.error('That batch already offers this course.'); return
    }
    await addDoc(collection(db, 'offerings'), { batch: offerBatch, course: offerCourse, createdAt: serverTimestamp() })
    setOfferCourse('')
    toast.success(`${offerBatch} now offers ${offerCourse}!`)
  }
  const removeOffering = async (id) => { await deleteDoc(doc(db, 'offerings', id)) }

  // Group offerings by batch for display
  const offeringsByBatch = {}
  offerings.forEach(o => {
    if (!offeringsByBatch[o.batch]) offeringsByBatch[o.batch] = []
    offeringsByBatch[o.batch].push(o)
  })

  return (
    <PageLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">Create and manage student, lecturer, and admin accounts.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowLookups(s => !s)} className="btn-secondary">⚙️ Batches &amp; Courses</button>
            <button onClick={() => setShowForm(f => !f)} className="btn-primary">+ New User</button>
          </div>
        </div>

        {/* Batches & Courses management panel */}
        {showLookups && (
          <div className="card mb-6 animate-slide-up space-y-6">
            <div>
              <h3 className="font-medium text-slate-900 mb-4">1. Define Batches &amp; Courses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Batches / Cohorts</label>
                  <div className="flex gap-2 mb-3">
                    <input className="input text-sm" placeholder="e.g. Cohort 9"
                      value={newBatch} onChange={e => setNewBatch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBatch())} />
                    <button onClick={addBatch} className="btn-secondary text-sm flex-shrink-0">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batches.map(b => (
                      <span key={b.id} className="badge badge-amber gap-1.5">
                        <button onClick={() => startRename('batch', b)} className="hover:underline">{b.name}</button>
                        <button onClick={() => removeBatch(b.id)} className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors text-[10px]">✕</button>
                      </span>
                    ))}
                    {batches.length === 0 && <p className="text-xs text-slate-400">No batches yet — add one above.</p>}
                  </div>
                </div>
                <div>
                  <label className="label">Courses / Modules</label>
                  <div className="flex gap-2 mb-3">
                    <input className="input text-sm" placeholder="e.g. COM6301"
                      value={newCourse} onChange={e => setNewCourse(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCourse())} />
                    <button onClick={addCourse} className="btn-secondary text-sm flex-shrink-0">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courses.map(c => (
                      <span key={c.id} className="badge badge-blue gap-1.5">
                        <button onClick={() => startRename('course', c)} className="hover:underline">{c.name}</button>
                        <button onClick={() => removeCourse(c.id)} className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors text-[10px]">✕</button>
                      </span>
                    ))}
                    {courses.length === 0 && <p className="text-xs text-slate-400">No courses yet — add one above.</p>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Click a tag's name to rename it.</p>
            </div>

            <div className="pt-5 border-t border-slate-200">
              <h3 className="font-medium text-slate-900 mb-1">2. Link Batches to Courses (Offerings)</h3>
              <p className="text-xs text-slate-500 mb-4">
                Pick which course a batch is actually running. This powers the cascading dropdowns everywhere else — pick a batch first, and only its linked courses show up.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <select className="input w-auto text-sm" value={offerBatch} onChange={e => setOfferBatch(e.target.value)}>
                  <option value="">Select batch…</option>
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <span className="self-center text-slate-400 text-sm">runs</span>
                <select className="input w-auto text-sm" value={offerCourse} onChange={e => setOfferCourse(e.target.value)}>
                  <option value="">Select course…</option>
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button onClick={addOffering} className="btn-primary text-sm flex-shrink-0">+ Link</button>
              </div>

              {Object.keys(offeringsByBatch).length === 0 ? (
                <p className="text-xs text-slate-400">No batch-course links yet — every batch will see every course as an option until you add some here.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(offeringsByBatch).map(([batchName, list]) => (
                    <div key={batchName} className="flex items-center gap-2 flex-wrap p-2 rounded-lg bg-slate-50">
                      <span className="badge badge-amber flex-shrink-0">{batchName}</span>
                      <span className="text-slate-400 text-xs">runs</span>
                      {list.map(o => (
                        <span key={o.id} className="badge badge-blue gap-1.5">
                          {o.course}
                          <button onClick={() => removeOffering(o.id)} className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors text-[10px]">✕</button>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rename modal */}
        {renameTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="card w-full max-w-sm animate-slide-up">
              <h3 className="font-medium text-slate-900 mb-4">Rename {renameTarget.kind}</h3>
              <input className="input mb-4" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveRename()} autoFocus />
              <div className="flex gap-2">
                <button onClick={saveRename} className="btn-primary">Save</button>
                <button onClick={() => setRenameTarget(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Create user form */}
        {showForm && (
          <form onSubmit={handleCreate} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">Create new account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="John Smith"
                  value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" placeholder="user@university.edu"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Temporary Password *</label>
                <input type="password" className="input" placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <label className="label">Batch / Cohort</label>
                <select className="input" value={form.batch}
                  onChange={e => setForm(f => ({ ...f, batch: e.target.value, module: '' }))}>
                  <option value="">— None (sees everything) —</option>
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Module / Course</label>
                <select className="input" value={form.module}
                  onChange={e => setForm(f => ({ ...f, module: e.target.value }))}>
                  <option value="">— None (sees everything) —</option>
                  {coursesForBatch(form.batch).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2 mb-4">
              Batch/Module determine which content, assignments, events, and forum threads this account will see. Set up batches/courses via "⚙️ Batches &amp; Courses" first.
            </p>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {/* Edit user modal */}
        {editingUser && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <form onSubmit={saveEdit} className="card w-full max-w-md animate-slide-up">
              <h3 className="font-medium text-slate-900 mb-4">Edit {editingUser.email}</h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={editForm.displayName}
                    onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Batch / Cohort</label>
                  <select className="input" value={editForm.batch}
                    onChange={e => setEditForm(f => ({ ...f, batch: e.target.value, module: '' }))}>
                    <option value="">— None (sees everything) —</option>
                    {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Module / Course</label>
                  <select className="input" value={editForm.module}
                    onChange={e => setEditForm(f => ({ ...f, module: e.target.value }))}>
                    <option value="">— None (sees everything) —</option>
                    {coursesForBatch(editForm.batch).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['all', 'student', 'lecturer', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all
                ${filter === r ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-slate-500 hover:text-slate-600'}`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">
                {r === 'all' ? users.length : users.filter(u => u.role === r).length}
              </span>
            </button>
          ))}
        </div>

        {/* Users table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Role</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Batch / Module</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Points</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Badges</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Joined</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-600 text-primary-700">
                          {(u.displayName || u.email)?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-slate-700">{u.displayName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${roleBadge[u.role] || 'badge-blue'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {u.batch || u.module ? `${u.batch || '—'} / ${u.module || '—'}` : <span className="text-slate-400">All / All</span>}
                    </td>
                    <td className="px-5 py-3 text-accent-700 font-mono font-600">
                      {(u.points || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.badges?.length || 0}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {u.createdAt?.toDate?.().toLocaleDateString() || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(u)} className="text-xs text-primary-700 hover:text-primary-800">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(u)} className="text-xs text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
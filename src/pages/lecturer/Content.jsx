import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { useLookups } from '../../hooks/useLookups'
import { PageLayout } from '../../components/common/Sidebar'
import toast from 'react-hot-toast'

export default function LecturerContent() {
  const { user } = useAuth()
  const { batches, coursesForBatch } = useLookups()
  const [materials, setMaterials] = useState([])
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', module: '', batch: '', description: '' })
  const [file, setFile] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [groupFilter, setGroupFilter] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'materials'), orderBy('uploadedAt', 'desc'))
    return onSnapshot(q, snap => setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !form.title.trim()) return
    setUploading(true)
    try {
      const path = `materials/${user.uid}/${Date.now()}_${file.name}`
      const snap = await uploadBytes(ref(storage, path), file)
      const url  = await getDownloadURL(snap.ref)

      await addDoc(collection(db, 'materials'), {
        title:        form.title.trim(),
        module:       form.module.trim(),
        batch:        form.batch.trim(),
        description:  form.description.trim(),
        fileUrl:      url,
        storagePath:  path,
        fileName:     file.name,
        fileType:     file.type,
        fileSize:     file.size,
        uploadedBy:   user.uid,
        uploadedAt:   serverTimestamp(),
      })
      setForm({ title: '', module: '', batch: '', description: '' })
      setFile(null)
      setShowForm(false)
      toast.success('Material uploaded successfully!')
    } catch (err) {
      toast.error('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (m) => {
    if (!confirm(`Delete "${m.title}"?`)) return
    try {
      await deleteObject(ref(storage, m.storagePath))
      await deleteDoc(doc(db, 'materials', m.id))
      toast.success('Material deleted.')
    } catch {
      toast.error('Could not delete material.')
    }
  }

  const groupKey = (m) => `${m.batch || 'All Batches'} · ${m.module || 'All Courses'}`
  const groupKeys = ['all', ...new Set(materials.map(groupKey))]
  const visibleMaterials = groupFilter === 'all' ? materials : materials.filter(m => groupKey(m) === groupFilter)

  return (
    <PageLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">Content Library</h1>
            <p className="text-slate-500 mt-1">Upload and manage lecture materials.</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary">
            + Upload Material
          </button>
        </div>

        {/* Upload form */}
        {showForm && (
          <form onSubmit={handleUpload} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">Upload new material</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Week 3 Lecture Slides"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Batch <span className="text-slate-400 font-normal">(blank = visible to everyone)</span></label>
                <select className="input" value={form.batch}
                  onChange={e => setForm(f => ({ ...f, batch: e.target.value, module: '' }))}>
                  <option value="">— Everyone —</option>
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Module</label>
                <select className="input" value={form.module}
                  onChange={e => setForm(f => ({ ...f, module: e.target.value }))}>
                  <option value="">— Everyone —</option>
                  {coursesForBatch(form.batch).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="Brief description…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="label">File (PDF or PPTX) *</label>
              <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx"
                className="block text-sm text-slate-500 file:mr-3 file:btn-secondary file:border-0 file:text-xs file:cursor-pointer"
                onChange={e => setFile(e.target.files[0])} required />
              {file && <p className="text-xs text-slate-500 mt-1">📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
                {uploading ? <><span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> Uploading…</> : 'Upload'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {/* Batch + Course group filter */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm text-slate-500">View:</label>
          <select className="input w-auto text-sm" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
            {groupKeys.map(k => <option key={k} value={k}>{k === 'all' ? 'All batches & courses' : k}</option>)}
          </select>
        </div>

        {/* Materials list */}
        <div className="space-y-3">
          {visibleMaterials.map(m => (
            <div key={m.id} className="card flex items-center gap-4 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{m.fileType?.includes('pdf') ? '📄' : '📊'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700">{m.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.module}{m.batch ? ` • ${m.batch}` : ''} • {m.fileName} • {(m.fileSize / 1024).toFixed(0)} KB</p>
                {m.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{m.description}</p>}
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {m.uploadedAt?.toDate?.().toLocaleDateString() || '—'}
              </span>
              <div className="flex gap-2 flex-shrink-0">
                <a href={m.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs px-3 py-1.5">View</a>
                <button onClick={() => handleDelete(m)} className="btn-danger text-xs px-3 py-1.5">Delete</button>
              </div>
            </div>
          ))}
          {visibleMaterials.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-4xl mb-3">📂</p>
              <p>No materials uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
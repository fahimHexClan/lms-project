import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { useLookups } from '../../hooks/useLookups'
import { PageLayout } from '../../components/common/Sidebar'
import CustomYouTubePlayer from '../../components/common/CustomYouTubePlayer'
import toast from 'react-hot-toast'

// Extracts a YouTube video ID from any common URL shape:
// watch?v=ID, youtu.be/ID, embed/ID, shorts/ID
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

const emptyForm = { heading: '', title: '', url: '', description: '', module: '', batch: '' }

export default function LecturerVideos() {
  const { user } = useAuth()
  const { batches, coursesForBatch } = useLookups()
  const [videos, setVideos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [groupFilter, setGroupFilter] = useState('all')
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'))
    return onSnapshot(q, snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const videoId = extractYouTubeId(form.url.trim())
    if (!videoId) {
      toast.error("Couldn't recognise that as a YouTube link. Paste the full video URL.")
      return
    }
    setSaving(true)
    try {
      await addDoc(collection(db, 'videos'), {
        heading: form.heading.trim() || 'General',
        title: form.title.trim(),
        videoId,
        description: form.description.trim(),
        module: form.module.trim(),
        batch: form.batch.trim(),
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
      })
      setForm(emptyForm)
      setShowForm(false)
      toast.success('Video added!')
    } catch {
      toast.error('Failed to add video.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (v) => {
    if (!confirm(`Remove "${v.title}"?`)) return
    await deleteDoc(doc(db, 'videos', v.id))
    toast.success('Video removed.')
  }

  const groupKey = (v) => `${v.batch || 'All Batches'} · ${v.module || 'All Courses'}`
  const groupKeys = ['all', ...new Set(videos.map(groupKey))]
  const visibleVideos = groupFilter === 'all' ? videos : videos.filter(v => groupKey(v) === groupFilter)

  // Group the currently-visible videos by their Heading (topic/week/chapter),
  // preserving upload order (most recent heading group first).
  const byHeading = {}
  visibleVideos.forEach(v => {
    const h = v.heading || 'General'
    if (!byHeading[h]) byHeading[h] = []
    byHeading[h].push(v)
  })
  const headings = Object.keys(byHeading)

  const toggleCollapse = (h) => setCollapsed(c => ({ ...c, [h]: !c[h] }))

  return (
    <PageLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-slate-900">Video Lectures</h1>
            <p className="text-slate-500 mt-1">Share recorded classes via YouTube, grouped by topic — students can watch, not download.</p>
          </div>
          <button onClick={() => setShowForm(f => !f)} className="btn-primary">+ Add Video</button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="card mb-6 animate-slide-up">
            <h3 className="font-medium text-slate-900 mb-4">Add a YouTube video</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="label">YouTube URL *</label>
                <input className="input" placeholder="https://www.youtube.com/watch?v=…"
                  value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Title *</label>
                <input className="input" placeholder="Part 2 — Setting up your first component"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Heading / Topic <span className="text-slate-400 font-normal">(groups videos together, e.g. "Week 1: Introduction")</span></label>
                <input className="input" placeholder="e.g. Week 1: Introduction to Networking"
                  value={form.heading} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))} />
              </div>
              <div>
                <label className="label">Batch <span className="text-slate-400 font-normal">(blank = everyone)</span></label>
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
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="What this lecture covers…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Adding…' : 'Add Video'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-2 mb-6">
          <label className="text-sm text-slate-500">View:</label>
          <select className="input w-auto text-sm" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
            {groupKeys.map(k => <option key={k} value={k}>{k === 'all' ? 'All batches & courses' : k}</option>)}
          </select>
        </div>

        {headings.map(h => (
          <div key={h} className="mb-8">
            <button
              onClick={() => toggleCollapse(h)}
              className="flex items-center gap-2 mb-4 w-full text-left"
            >
              <svg className={`w-4 h-4 text-slate-500 transition-transform ${collapsed[h] ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <h2 className="font-display text-lg font-700 text-slate-900">{h}</h2>
              <span className="badge badge-blue">{byHeading[h].length} video{byHeading[h].length !== 1 ? 's' : ''}</span>
            </button>
            {!collapsed[h] && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {byHeading[h].map(v => (
                  <div key={v.id} className="card p-0 overflow-hidden">
                    <CustomYouTubePlayer videoId={v.videoId} title={v.title} />
                    <div className="p-4">
                      <p className="font-medium text-slate-900 text-sm mb-1">{v.title}</p>
                      {v.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{v.description}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className="badge badge-blue">{v.module || 'All Courses'}</span>
                        {v.batch && <span className="badge badge-amber">{v.batch}</span>}
                      </div>
                      <button onClick={() => handleDelete(v)} className="text-xs text-red-600 hover:text-red-700">
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {visibleVideos.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">🎬</p>
            <p>No videos yet — add your first lecture link.</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
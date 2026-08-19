import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'

export default function StudentContent() {
  const { user } = useAuth()
  const [profile, setProfile]     = useState(null)
  const [materials, setMaterials] = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), s => s.exists() && setProfile(s.data()))
  }, [user])

  useEffect(() => {
    const q = query(collection(db, 'materials'), orderBy('uploadedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  // Visibility rule: batch + module are treated as ONE combined unit.
  // - Both blank on the item  -> true campus-wide broadcast, everyone sees it
  // - Both set                -> must match the student's own batch AND module exactly
  // - Only one set (legacy/partial data) -> hidden, to avoid leaking across
  //   the other dimension (e.g. a Batch-only tag leaking across courses)
  const visibleToMe = (m) => {
    const bothBlank = !m.batch && !m.module
    const bothMatch = m.batch === profile?.batch && m.module === profile?.module
    return bothBlank || bothMatch
  }

  const filtered = materials.filter(m =>
    visibleToMe(m) && (
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.module?.toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <PageLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Content Library</h1>
          <p className="text-slate-500 mt-1">Access all your lecture materials and resources.</p>
        </div>

        <div className="mb-6">
          <input
            className="input max-w-md"
            placeholder="Search materials…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">📂</p>
            <p>No materials found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function MaterialCard({ material: m }) {
  const isPDF = m.fileType === 'application/pdf'
  const handleDownload = async () => {
    try {
      const url = await getDownloadURL(ref(storage, m.storagePath))
      window.open(url, '_blank')
    } catch {
      alert('Could not open file.')
    }
  }

  return (
    <div className="card hover:border-slate-300 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{isPDF ? '📄' : '📊'}</span>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <span className="badge badge-blue">{m.module || 'General'}</span>
          {m.batch && <span className="badge badge-amber">{m.batch}</span>}
        </div>
      </div>
      <h3 className="font-medium text-slate-700 text-sm mb-1 line-clamp-2">{m.title}</h3>
      {m.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{m.description}</p>
      )}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
        <span className="text-xs text-slate-500">
          {m.uploadedAt?.toDate?.().toLocaleDateString() || '—'}
        </span>
        <button onClick={handleDownload} className="btn-primary text-xs px-3 py-1.5">
          {isPDF ? 'View PDF' : 'Download'}
        </button>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../services/firebase'
import { PageLayout } from '../../components/common/Sidebar'

export default function StudentContent() {
  const [materials, setMaterials] = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'materials'), orderBy('uploadedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = materials.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.module?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-white">Content Library</h1>
          <p className="text-gray-500 mt-1">Access all your lecture materials and resources.</p>
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
          <div className="text-center py-20 text-gray-600">
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
    <div className="card hover:border-gray-700 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-900/40 border border-primary-800/30 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{isPDF ? '📄' : '📊'}</span>
        </div>
        <span className="badge badge-blue">{m.module || 'General'}</span>
      </div>
      <h3 className="font-medium text-gray-200 text-sm mb-1 line-clamp-2">{m.title}</h3>
      {m.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{m.description}</p>
      )}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-600">
          {m.uploadedAt?.toDate?.().toLocaleDateString() || '—'}
        </span>
        <button onClick={handleDownload} className="btn-primary text-xs px-3 py-1.5">
          {isPDF ? 'View PDF' : 'Download'}
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import CustomYouTubePlayer from '../../components/common/CustomYouTubePlayer'

export default function StudentVideos() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), s => s.exists() && setProfile(s.data()))
  }, [user])

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'))
    return onSnapshot(q, snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  // Same combined batch+module visibility rule used everywhere else in the app.
  const visibleToMe = (v) => {
    const bothBlank = !v.batch && !v.module
    const bothMatch = v.batch === profile?.batch && v.module === profile?.module
    return bothBlank || bothMatch
  }

  const filtered = videos.filter(v =>
    visibleToMe(v) && (
      v.title?.toLowerCase().includes(search.toLowerCase()) ||
      v.module?.toLowerCase().includes(search.toLowerCase()) ||
      v.heading?.toLowerCase().includes(search.toLowerCase())
    )
  )

  // Group by Heading/Topic so students can find lectures by week/chapter.
  const byHeading = {}
  filtered.forEach(v => {
    const h = v.heading || 'General'
    if (!byHeading[h]) byHeading[h] = []
    byHeading[h].push(v)
  })
  const headings = Object.keys(byHeading)
  const toggleCollapse = (h) => setCollapsed(c => ({ ...c, [h]: !c[h] }))

  return (
    <PageLayout>
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Video Lectures</h1>
          <p className="text-slate-500 mt-1">Recorded classes from your lecturers, grouped by topic. Streaming only — no downloads.</p>
        </div>

        <input
          className="input mb-6 max-w-sm"
          placeholder="Search videos or topics…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

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
                    <CustomYouTubePlayer videoId={v.videoId} title={v.title} watermark={user?.email} />
                    <div className="p-4">
                      <p className="font-medium text-slate-900 text-sm mb-1">{v.title}</p>
                      {v.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{v.description}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="badge badge-blue">{v.module || 'General'}</span>
                        {v.batch && <span className="badge badge-amber">{v.batch}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">🎬</p>
            <p>{videos.length === 0 ? 'No video lectures uploaded yet.' : 'No videos match your search.'}</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'

const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard({ maxRows = 10 }) {
  const { user } = useAuth()
  const [leaders, setLeaders] = useState([])

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('points', 'desc'),
      limit(maxRows)
    )
    const unsub = onSnapshot(q, snap => {
      setLeaders(snap.docs.map((d, i) => ({ id: d.id, rank: i + 1, ...d.data() })))
    })
    return unsub
  }, [maxRows])

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏆</span>
        <h3 className="font-display text-slate-900 font-700">Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {leaders.map((l) => (
          <div
            key={l.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
              ${l.id === user?.uid
                ? 'bg-primary-900/30 border border-primary-800/40'
                : 'hover:bg-slate-100'
              }`}
          >
            <span className="text-lg w-7 text-center flex-shrink-0">
              {medals[l.rank - 1] || <span className="text-slate-500 text-sm font-mono">{l.rank}</span>}
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-600 text-primary-700 flex-shrink-0">
              {(l.displayName || l.email)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {l.displayName || l.email?.split('@')[0]}
                {l.id === user?.uid && <span className="text-primary-700 ml-1">(you)</span>}
              </p>
              {l.badges?.length > 0 && (
                <p className="text-xs text-slate-500 truncate">{l.badges.slice(0, 3).join(' • ')}</p>
              )}
            </div>
            <span className="text-sm font-mono font-600 text-accent-700 flex-shrink-0">
              {(l.points || 0).toLocaleString()} pts
            </span>
          </div>
        ))}
        {leaders.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No students yet</p>
        )}
      </div>
    </div>
  )
}
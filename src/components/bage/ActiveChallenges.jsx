import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

const challengeIcons = {
  late_submission: '📋',
  broken_streak:   '🔥',
  forum_inactive:  '💬',
  mentor:          '🏆',
  login_streak:    '⚡',
}

const challengeColors = {
  late_submission: 'border-accent-200 bg-accent-50',
  broken_streak:   'border-orange-200 bg-orange-50',
  forum_inactive:  'border-sky-200 bg-sky-50',
  mentor:          'border-purple-200 bg-purple-50',
  login_streak:    'border-emerald-200 bg-emerald-50',
}

// Progress goal per challenge type, used to render "1 of 2 done" style bars.
// Values mirror the thresholds the BAGE Cloud Function checks server-side.
const goals = {
  late_submission: { metric: 'onTimeSubmissions',  target: 2 },
  broken_streak:   { metric: 'loginStreak',        target: 3 },
  forum_inactive:  { metric: 'forumPostsThisWeek',  target: 1 },
  mentor:          { metric: 'forumPostsThisWeek',  target: 1 },
}

export default function ActiveChallenges() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState([])
  const [behaviour, setBehaviour]   = useState(null)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'challenges'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    )
    return onSnapshot(q, snap => setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      doc(db, 'userBehaviour', user.uid),
      snap => snap.exists() && setBehaviour(snap.data())
    )
    return unsub
  }, [user])

  if (!challenges.length) return null

  return (
    <div className="card border-primary-200 bg-primary-50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">⚡</span>
        <h3 className="font-display text-slate-900 font-700">Active Challenges</h3>
        <span className="badge badge-purple ml-auto">{challenges.length} active</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        These unlock automatically the moment BAGE detects you've done the action — no need to click anything.
      </p>
      <div className="space-y-3">
        {challenges.map(ch => {
          const goal = goals[ch.type]
          const start = ch.startSnapshot?.[goal?.metric] || 0
          const current = behaviour?.[goal?.metric] || 0
          const progress = goal ? Math.min(Math.max(current - start, 0), goal.target) : 0
          const pct = goal ? Math.round((progress / goal.target) * 100) : 0

          return (
            <div
              key={ch.id}
              className={`border rounded-xl p-4 ${challengeColors[ch.type] || 'border-slate-300 bg-slate-50'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{challengeIcons[ch.type] || '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{ch.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{ch.description}</p>

                  {goal && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{progress} / {goal.target}</span>
                      </div>
                      <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                    <span className="badge badge-green">+{ch.bonusPoints} pts</span>
                    <span className="badge badge-purple">🏅 {ch.badge}</span>
                    {ch.expiresAt && (
                      <span className="text-xs text-slate-500">
                        Expires {formatDistanceToNow(ch.expiresAt.toDate?.() || ch.expiresAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
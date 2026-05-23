import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, updateDoc, doc, increment, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const challengeIcons = {
  late_submission: '📋',
  broken_streak:   '🔥',
  forum_inactive:  '💬',
  mentor:          '🏆',
  login_streak:    '⚡',
}

const challengeColors = {
  late_submission: 'border-amber-800/40 bg-amber-900/10',
  broken_streak:   'border-orange-800/40 bg-orange-900/10',
  forum_inactive:  'border-blue-800/40 bg-blue-900/10',
  mentor:          'border-purple-800/40 bg-purple-900/10',
  login_streak:    'border-green-800/40 bg-green-900/10',
}

export default function ActiveChallenges() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'challenges'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    )
    const unsub = onSnapshot(q, snap => {
      setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const markComplete = async (challenge) => {
    try {
      // Mark challenge done
      await updateDoc(doc(db, 'challenges', challenge.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
      })
      // Award bonus points and badge
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(challenge.bonusPoints),
        badges: arrayUnion(challenge.badge),
      })
      toast.success(`+${challenge.bonusPoints} pts • "${challenge.badge}" badge unlocked! 🎉`)
    } catch (err) {
      toast.error('Could not complete challenge. Try again.')
    }
  }

  if (!challenges.length) return null

  return (
    <div className="card border-primary-800/30 bg-primary-900/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <h3 className="font-display text-white font-700">Active Challenges</h3>
        <span className="badge badge-purple ml-auto">{challenges.length} active</span>
      </div>
      <div className="space-y-3">
        {challenges.map(ch => (
          <div
            key={ch.id}
            className={`border rounded-xl p-4 ${challengeColors[ch.type] || 'border-gray-700 bg-gray-800/30'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{challengeIcons[ch.type] || '🎯'}</span>
                <div>
                  <p className="font-medium text-white text-sm">{ch.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{ch.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge badge-green">+{ch.bonusPoints} pts</span>
                    <span className="badge badge-purple">🏅 {ch.badge}</span>
                    {ch.expiresAt && (
                      <span className="text-xs text-gray-500">
                        Expires {formatDistanceToNow(ch.expiresAt.toDate?.() || ch.expiresAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => markComplete(ch)}
                className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
              >
                Complete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

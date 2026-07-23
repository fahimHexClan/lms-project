import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, query, where, onSnapshot as onSnap } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { PageLayout } from '../../components/common/Sidebar'
import Leaderboard from '../../components/bage/Leaderboard'

const ALL_BADGES = [
  { name: 'On-Track',       emoji: '📋', desc: 'Submitted 2 assignments before deadline after being late.' },
  { name: 'Comeback',       emoji: '🔥', desc: 'Rebuilt your login streak after breaking it.' },
  { name: 'Discussion Spark', emoji: '💬', desc: 'Posted in the forum after 7 days of inactivity.' },
  { name: 'Mentor',         emoji: '🏆', desc: 'Answered a forum question as a top performer.' },
  { name: 'Week Warrior',   emoji: '⚡', desc: 'Logged in for 7 consecutive days.' },
  { name: 'First Submit',   emoji: '🚀', desc: 'Submitted your first assignment.' },
  { name: 'Forum Star',     emoji: '⭐', desc: 'Posted 10 times in the forum.' },
  { name: 'Perfect Week',   emoji: '💯', desc: 'Completed all activities in a week.' },
]

export default function StudentGamification() {
  const { user } = useAuth()
  const [profile, setProfile]         = useState(null)
  const [completedChallenges, setCC]  = useState([])
  const [activeChallenges, setAC]     = useState([])

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), s => s.exists() && setProfile(s.data()))
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'challenges'), where('userId', '==', user.uid), where('status', '==', 'completed'))
    return onSnapshot(q, s => setCC(s.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'challenges'), where('userId', '==', user.uid), where('status', '==', 'active'))
    return onSnapshot(q, s => setAC(s.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user])

  const earnedBadges = new Set(profile?.badges || [])
  const points = profile?.points || 0
  const level  = Math.floor(points / 100) + 1
  const levelProgress = ((points % 100) / 100) * 100

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Achievements</h1>
          <p className="text-slate-500 mt-1">Your gamification progress and BAGE challenge history.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* XP Card */}
            <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-500 text-sm">Total Points</p>
                  <p className="font-display text-4xl font-700 text-gradient">{points.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-sm">Level</p>
                  <p className="font-display text-4xl font-700 text-slate-900">{level}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Level {level}</span>
                  <span>{points % 100} / 100 pts to Level {level + 1}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-200/60">
                <div className="text-center">
                  <p className="font-display font-700 text-slate-900 text-xl">{earnedBadges.size}</p>
                  <p className="text-xs text-slate-500">Badges</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-700 text-slate-900 text-xl">{completedChallenges.length}</p>
                  <p className="text-xs text-slate-500">Challenges done</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-700 text-orange-600 text-xl">{profile?.loginStreak || 0}🔥</p>
                  <p className="text-xs text-slate-500">Day streak</p>
                </div>
              </div>
            </div>

            {/* BAGE active challenges */}
            {activeChallenges.length > 0 && (
              <div className="card border-primary-200">
                <h3 className="font-display text-slate-900 font-700 mb-4">⚡ Active BAGE Challenges</h3>
                <div className="space-y-2">
                  {activeChallenges.map(ch => (
                    <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                      <span className="text-xl">{ch.type === 'late_submission' ? '📋' : ch.type === 'broken_streak' ? '🔥' : ch.type === 'forum_inactive' ? '💬' : '🏆'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{ch.title}</p>
                        <p className="text-xs text-slate-500">{ch.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="badge badge-green">+{ch.bonusPoints}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badges grid */}
            <div className="card">
              <h3 className="font-display text-slate-900 font-700 mb-4">🏅 Badge Collection</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ALL_BADGES.map(b => {
                  const earned = earnedBadges.has(b.name)
                  return (
                    <div
                      key={b.name}
                      className={`rounded-xl p-3 text-center border transition-all ${
                        earned
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-slate-200 bg-slate-50 opacity-40 grayscale'
                      }`}
                    >
                      <span className="text-3xl block mb-1">{b.emoji}</span>
                      <p className="text-xs font-medium text-slate-700">{b.name}</p>
                      {earned && <p className="text-xs text-slate-500 mt-0.5 leading-tight">{b.desc}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Completed challenges history */}
            {completedChallenges.length > 0 && (
              <div className="card">
                <h3 className="font-display text-slate-900 font-700 mb-4">✅ Completed Challenges</h3>
                <div className="space-y-2">
                  {completedChallenges.map(ch => (
                    <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-lg">✅</span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">{ch.title}</p>
                      </div>
                      <span className="badge badge-green">+{ch.bonusPoints} pts</span>
                      <span className="badge badge-purple">🏅 {ch.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: full leaderboard */}
          <div>
            <Leaderboard maxRows={15} />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
import { useEffect, useState } from 'react'
import { collection, getDocs, where, query } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { PageLayout } from '../../components/common/Sidebar'
import GroupedLeaderboards from '../../components/bage/GroupedLeaderboards'
import GroupedMarksLeaderboards from '../../components/bage/GroupedMarksLeaderboards'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0, lecturers: 0, materials: 0,
    assignments: 0, submissions: 0, threads: 0, challenges: 0
  })

  useEffect(() => {
    const load = async () => {
      const [students, lecturers, materials, assignments, submissions, threads, challenges] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'lecturer'))),
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'forumThreads')),
        getDocs(query(collection(db, 'challenges'), where('status', '==', 'completed'))),
      ])
      setStats({
        students:    students.size,
        lecturers:   lecturers.size,
        materials:   materials.size,
        assignments: assignments.size,
        submissions: submissions.size,
        threads:     threads.size,
        challenges:  challenges.size,
      })
    }
    load()
  }, [])

  const statCards = [
    { label: 'Students',            value: stats.students,    emoji: '🎓', color: 'text-primary-700', badge: 'primary' },
    { label: 'Lecturers',           value: stats.lecturers,   emoji: '👨‍🏫', color: 'text-sky-700', badge: 'sky' },
    { label: 'Materials Uploaded',  value: stats.materials,   emoji: '📄', color: 'text-teal-700', badge: 'green' },
    { label: 'Assignments',         value: stats.assignments,  emoji: '📋', color: 'text-accent-700', badge: 'accent' },
    { label: 'Submissions',         value: stats.submissions,  emoji: '📨', color: 'text-emerald-700', badge: 'green' },
    { label: 'Forum Threads',       value: stats.threads,     emoji: '💬', color: 'text-sky-700', badge: 'sky' },
    { label: 'BAGE Challenges Done', value: stats.challenges, emoji: '⚡', color: 'text-accent-700', badge: 'accent' },
  ]

  return (
    <PageLayout>
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700 text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Platform-wide overview and management.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="stat-tile">
              <div className={`icon-badge-${s.badge}`}>{s.emoji}</div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
                <p className={`text-xl font-display font-700 ${s.color} leading-tight`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-display text-slate-900 font-700 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <a href="/admin/users" className="btn-secondary flex items-center gap-2 justify-center">
                👥 Manage Users
              </a>
              <a href="/admin/analytics" className="btn-secondary flex items-center gap-2 justify-center">
                📊 View Analytics
              </a>
              <a href="/admin/calendar" className="btn-secondary flex items-center gap-2 justify-center">
                📅 Calendar
              </a>
              <a href="/admin/analytics" className="btn-primary flex items-center gap-2 justify-center">
                📥 Export Report
              </a>
            </div>
          </div>

          <div className="card border-primary-200 bg-primary-50">
            <h3 className="font-display text-slate-900 font-700 mb-2">⚡ BAGE Engine Status</h3>
            <p className="text-sm text-slate-500 mb-3">
              Behaviour-Adaptive Gamification Engine is active. Cloud Functions monitor student actions in real-time.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-100 rounded-xl p-3">
                <p className="text-xl font-display font-700 text-emerald-700">{stats.challenges}</p>
                <p className="text-xs text-slate-500">Challenges completed</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-3">
                <p className="text-xl font-display font-700 text-primary-700">5</p>
                <p className="text-xs text-slate-500">Pattern types</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-3">
                <p className="text-xl font-display font-700 text-accent-700">Live</p>
                <p className="text-xs text-slate-500">Engine status</p>
              </div>
            </div>
          </div>
        </div>

            <div className="mt-6">
          <GroupedLeaderboards maxPerGroup={5} />
        </div>

        <div className="mt-6">
          <GroupedMarksLeaderboards maxPerGroup={5} />
        </div>
      </div>
    </PageLayout>
  )
}
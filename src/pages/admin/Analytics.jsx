import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { PageLayout } from '../../components/common/Sidebar'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

export default function AdminAnalytics() {
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const [data, setData] = useState({
    users: [], submissions: [], challenges: [], threads: [], behaviours: []
  })
  const [summary, setSummary] = useState({
    totalStudents: 0, avgPoints: 0, onTimeRate: 0,
    forumActiveStudents: 0, bageCompletionRate: 0,
    totalSubmissions: 0, gradedSubmissions: 0,
  })

  useEffect(() => {
    const load = async () => {
      const [usersSnap, subsSnap, chalSnap, threadSnap, behSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'challenges')),
        getDocs(collection(db, 'forumThreads')),
        getDocs(collection(db, 'userBehaviour')),
      ])

      const users       = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const submissions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const challenges  = chalSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const threads     = threadSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const behaviours  = behSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const avgPoints = users.length
        ? Math.round(users.reduce((s, u) => s + (u.points || 0), 0) / users.length)
        : 0

      const onTimeSubs  = submissions.filter(s => s.isOnTime).length
      const onTimeRate  = submissions.length ? Math.round((onTimeSubs / submissions.length) * 100) : 0

      const activeForumIds = new Set(threads.map(t => t.authorId))
      const forumActiveStudents = users.filter(u => activeForumIds.has(u.id)).length

      const completed        = challenges.filter(c => c.status === 'completed').length
      const bageCompletionRate = challenges.length ? Math.round((completed / challenges.length) * 100) : 0

      setData({ users, submissions, challenges, threads, behaviours })
      setSummary({
        totalStudents: users.length,
        avgPoints,
        onTimeRate,
        forumActiveStudents,
        bageCompletionRate,
        totalSubmissions:  submissions.length,
        gradedSubmissions: submissions.filter(s => s.grade !== null).length,
      })
      setLoading(false)
    }
    load()
  }, [])

  const exportToExcel = () => {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Student Summary
      const studentRows = data.users.map(u => {
        const beh = data.behaviours.find(b => b.userId === u.id) || {}
        const subs = data.submissions.filter(s => s.studentId === u.id)
        const chal = data.challenges.filter(c => c.userId === u.id)
        return {
          'Name':                u.displayName || '—',
          'Email':               u.email,
          'Points':              u.points || 0,
          'Badges':              (u.badges || []).join(', ') || 'None',
          'Login Streak':        beh.loginStreak || 0,
          'Total Submissions':   subs.length,
          'On-Time Submissions': subs.filter(s => s.isOnTime).length,
          'Late Submissions':    beh.lateSubmissions || 0,
          'Forum Posts (week)':  beh.forumPostsThisWeek || 0,
          'BAGE Challenges Done': chal.filter(c => c.status === 'completed').length,
          'Active Challenges':   chal.filter(c => c.status === 'active').length,
        }
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows), 'Student Engagement')

      // Sheet 2: Submission Log
      const subRows = data.submissions.map(s => ({
        'Assignment ID': s.assignmentId,
        'Student ID':    s.studentId,
        'File':          s.fileName,
        'On Time':       s.isOnTime ? 'Yes' : 'No',
        'Grade':         s.grade ?? 'Not graded',
        'Feedback':      s.feedback || '—',
        'Submitted At':  s.submittedAt?.toDate?.().toLocaleString() || '—',
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subRows), 'Submissions')

      // Sheet 3: BAGE Challenge Log
      const bageRows = data.challenges.map(c => ({
        'User ID':      c.userId,
        'Challenge':    c.title,
        'Type':         c.type,
        'Status':       c.status,
        'Bonus Points': c.bonusPoints,
        'Badge':        c.badge,
        'Created':      c.createdAt?.toDate?.().toLocaleString() || '—',
        'Completed':    c.completedAt?.toDate?.().toLocaleString() || '—',
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bageRows), 'BAGE Challenges')

      // Sheet 4: Platform Summary
      const summaryRows = [
        { Metric: 'Total Students',              Value: summary.totalStudents },
        { Metric: 'Average Points per Student',  Value: summary.avgPoints },
        { Metric: 'On-Time Submission Rate (%)', Value: summary.onTimeRate },
        { Metric: 'Forum-Active Students',       Value: summary.forumActiveStudents },
        { Metric: 'BAGE Challenge Completion (%)', Value: summary.bageCompletionRate },
        { Metric: 'Total Submissions',           Value: summary.totalSubmissions },
        { Metric: 'Graded Submissions',          Value: summary.gradedSubmissions },
        { Metric: 'Report Generated',            Value: new Date().toLocaleString() },
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Platform Summary')

      XLSX.writeFile(wb, `EduCore_LMS_Report_${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.success('Excel report downloaded!')
    } catch (err) {
      toast.error('Export failed.')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <PageLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    </PageLayout>
  )

  const metricCards = [
    { label: 'Total Students',             value: summary.totalStudents,        unit: '',  color: 'text-primary-400' },
    { label: 'Avg Points / Student',        value: summary.avgPoints,            unit: 'pts', color: 'text-accent-400' },
    { label: 'On-Time Submission Rate',    value: `${summary.onTimeRate}%`,     unit: '',  color: summary.onTimeRate >= 70 ? 'text-green-400' : 'text-amber-400' },
    { label: 'Forum-Active Students',      value: summary.forumActiveStudents,  unit: '',  color: 'text-cyan-400' },
    { label: 'BAGE Challenge Completion',  value: `${summary.bageCompletionRate}%`, unit: '', color: 'text-yellow-400' },
    { label: 'Total Submissions',          value: summary.totalSubmissions,     unit: '',  color: 'text-blue-400' },
    { label: 'Graded Submissions',         value: summary.gradedSubmissions,    unit: '',  color: 'text-teal-400' },
    { label: 'Ungraded',                   value: summary.totalSubmissions - summary.gradedSubmissions, unit: '', color: 'text-red-400' },
  ]

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-700 text-white">MIS Analytics</h1>
            <p className="text-gray-500 mt-1">Platform engagement metrics and BAGE performance data.</p>
          </div>
          <button onClick={exportToExcel} disabled={exporting} className="btn-primary flex items-center gap-2">
            {exporting ? (
              <><span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> Exporting…</>
            ) : '📥 Export Excel'}
          </button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {metricCards.map(m => (
            <div key={m.label} className="card-sm">
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className={`text-2xl font-display font-700 ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* BAGE analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="font-display text-white font-700 mb-4">⚡ BAGE Challenge Breakdown</h3>
            {(() => {
              const types = ['late_submission','broken_streak','forum_inactive','mentor','login_streak']
              const labels = {
                late_submission: '📋 Late Submission Recovery',
                broken_streak:   '🔥 Login Streak Rebuild',
                forum_inactive:  '💬 Forum Re-engagement',
                mentor:          '🏆 Mentor Challenge',
                login_streak:    '⚡ Streak Milestone',
              }
              return types.map(type => {
                const total     = data.challenges.filter(c => c.type === type).length
                const completed = data.challenges.filter(c => c.type === type && c.status === 'completed').length
                const pct = total ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={type} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{labels[type]}</span>
                      <span className="text-gray-500">{completed}/{total} — {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          <div className="card">
            <h3 className="font-display text-white font-700 mb-4">📊 Per-Student Engagement</h3>
            <div className="overflow-y-auto max-h-64 space-y-2">
              {data.users
                .sort((a, b) => (b.points || 0) - (a.points || 0))
                .map(u => {
                  const beh  = data.behaviours.find(b => b.userId === u.id) || {}
                  const subs = data.submissions.filter(s => s.studentId === u.id)
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800/40">
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-600 text-primary-400 flex-shrink-0">
                        {(u.displayName || u.email)?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-300 truncate">{u.displayName || u.email?.split('@')[0]}</p>
                        <p className="text-xs text-gray-600">
                          {subs.length} subs • streak {beh.loginStreak || 0}d • {beh.forumPostsThisWeek || 0} posts/wk
                        </p>
                      </div>
                      <span className="text-xs font-mono font-600 text-accent-400">{u.points || 0} pts</span>
                    </div>
                  )
                })}
              {data.users.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-6">No student data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Submission on-time analysis */}
        <div className="card">
          <h3 className="font-display text-white font-700 mb-4">📨 Submission Analysis</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-700 text-green-400">
                {data.submissions.filter(s => s.isOnTime).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">On-time submissions</p>
            </div>
            <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-700 text-amber-400">
                {data.submissions.filter(s => !s.isOnTime).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Late submissions</p>
            </div>
            <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-700 text-blue-400">
                {data.submissions.filter(s => s.grade !== null).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Graded</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center mt-2">
            Click "Export Excel" above to download the full 4-sheet report including BAGE logs, submission logs, and per-student data.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}

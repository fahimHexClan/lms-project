/**
 * Analytics Cloud Function
 * Generates a weekly platform summary saved to Firestore.
 * Admin Analytics page reads this for instant load without re-querying everything.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')

const db = admin.firestore()

exports.generateWeeklyReport = onSchedule('every monday 06:00', async () => {
  try {
    const [usersSnap, subsSnap, chalSnap, threadSnap] = await Promise.all([
      db.collection('users').where('role', '==', 'student').get(),
      db.collection('submissions').get(),
      db.collection('challenges').get(),
      db.collection('forumThreads').get(),
    ])

    const users       = usersSnap.docs.map(d => d.data())
    const submissions = subsSnap.docs.map(d => d.data())
    const challenges  = chalSnap.docs.map(d => d.data())

    const totalStudents    = users.length
    const avgPoints        = totalStudents
      ? Math.round(users.reduce((s, u) => s + (u.points || 0), 0) / totalStudents)
      : 0
    const onTimeSubs       = submissions.filter(s => s.isOnTime).length
    const onTimeRate       = submissions.length
      ? Math.round((onTimeSubs / submissions.length) * 100) : 0
    const completedChal    = challenges.filter(c => c.status === 'completed').length
    const bageCompletionRate = challenges.length
      ? Math.round((completedChal / challenges.length) * 100) : 0

    // Save report snapshot
    await db.collection('weeklyReports').add({
      generatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      weekEnding:        new Date().toISOString().slice(0, 10),
      totalStudents,
      avgPoints,
      onTimeRate,
      bageCompletionRate,
      totalSubmissions:  submissions.length,
      gradedSubmissions: submissions.filter(s => s.grade !== null).length,
      totalThreads:      threadSnap.size,
      completedChallenges: completedChal,
    })

    console.log('[ANALYTICS] Weekly report generated successfully.')
  } catch (err) {
    console.error('[ANALYTICS] Report generation failed:', err)
  }
})

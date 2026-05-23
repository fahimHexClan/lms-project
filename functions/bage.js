/**
 * BAGE — Behaviour-Adaptive Gamification Engine
 * Firebase Cloud Function: triggers on every userBehaviour document write.
 *
 * Architecture layers:
 *   1. Behaviour Tracking   — reads updated behavioural profile
 *   2. Pattern Detection    — evaluates 5 pattern thresholds
 *   3. Adaptive Reward Delivery — writes challenges to Firestore
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')

const db = admin.firestore()

// ── Pattern definitions ───────────────────────────────────────────────────────
const PATTERNS = [
  {
    type: 'late_submission',
    detect: (b) => (b.lateSubmissions || 0) >= 2,
    challenge: {
      title:       'Get back on track!',
      description: 'Submit your next 2 assignments before the deadline.',
      bonusPoints: 25,
      badge:       'On-Track',
      expiryDays:  7,
    },
  },
  {
    type: 'broken_streak',
    detect: (b) => b.loginStreakBroken === true && (b.previousStreak || 0) >= 3,
    challenge: {
      title:       'Comeback time!',
      description: 'Log in 3 consecutive days to rebuild your streak.',
      bonusPoints: 15,
      badge:       'Comeback',
      expiryDays:  5,
    },
  },
  {
    type: 'forum_inactive',
    detect: (b) => (b.forumPostsThisWeek || 0) === 0 && (b.daysSinceLastPost || 0) >= 7,
    challenge: {
      title:       'Join the discussion!',
      description: 'Post 1 answer or question in the forum this week.',
      bonusPoints: 20,
      badge:       'Discussion Spark',
      expiryDays:  7,
    },
  },
  {
    type: 'mentor',
    detect: (b) =>
      (b.onTimeSubmissions || 0) >= 3 &&
      (b.lateSubmissions || 0) === 0,
    challenge: {
      title:       "You're on fire — mentor others!",
      description: 'Answer 1 forum question this week.',
      bonusPoints: 30,
      badge:       'Mentor',
      expiryDays:  7,
    },
  },
]

// ── Main BAGE trigger ─────────────────────────────────────────────────────────
exports.bageEngine = onDocumentWritten(
  'userBehaviour/{userId}',
  async (event) => {
    const userId = event.params.userId
    const after  = event.data.after

    // Doc deleted — nothing to do
    if (!after || !after.exists) return null

    const behaviour = after.data()

    // ── Pattern 5: Login streak milestone (7 days) ─────────────────────────
    if ((behaviour.loginStreak || 0) === 7) {
      const batch = db.batch()

      // Award milestone badge directly — no challenge needed
      batch.update(db.collection('users').doc(userId), {
        points: admin.firestore.FieldValue.increment(50),
        badges: admin.firestore.FieldValue.arrayUnion('Week Warrior'),
      })

      // Log milestone
      batch.set(db.collection('milestones').doc(`${userId}_7day_${Date.now()}`), {
        userId,
        type:       'login_streak_7',
        badge:      'Week Warrior',
        pointsAwarded: 50,
        awardedAt:  admin.firestore.FieldValue.serverTimestamp(),
      })

      await batch.commit()
      console.log(`[BAGE] Week Warrior milestone awarded to ${userId}`)
    }

    // ── Patterns 1–4: evaluate and write challenges ────────────────────────
    const promises = []

    for (const pattern of PATTERNS) {
      if (!pattern.detect(behaviour)) continue

      const challengeRef = db.collection('challenges').doc(`${userId}_${pattern.type}`)
      const existing     = await challengeRef.get()

      // Don't re-trigger if an active challenge of this type already exists
      if (existing.exists && existing.data().status === 'active') {
        console.log(`[BAGE] Skipping ${pattern.type} — already active for ${userId}`)
        continue
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + pattern.challenge.expiryDays)

      promises.push(
        challengeRef.set({
          userId,
          type:        pattern.type,
          title:       pattern.challenge.title,
          description: pattern.challenge.description,
          bonusPoints: pattern.challenge.bonusPoints,
          badge:       pattern.challenge.badge,
          expiresAt,
          status:      'active',
          createdAt:   admin.firestore.FieldValue.serverTimestamp(),
          completedAt: null,
        })
      )
      console.log(`[BAGE] Challenge triggered: ${pattern.type} for user ${userId}`)
    }

    if (promises.length) await Promise.all(promises)
    return null
  }
)

// ── Auto-expire stale challenges ──────────────────────────────────────────────
// Runs once daily via Cloud Scheduler
exports.expireChallenges = require('firebase-functions/v2/scheduler')
  .onSchedule('every 24 hours', async () => {
    const now     = new Date()
    const expired = await db.collection('challenges')
      .where('status', '==', 'active')
      .where('expiresAt', '<', now)
      .get()

    const batch = db.batch()
    expired.docs.forEach(d => {
      batch.update(d.ref, { status: 'expired' })
    })
    await batch.commit()
    console.log(`[BAGE] Expired ${expired.size} stale challenges.`)
  })

// ── Weekly forum inactivity reset ────────────────────────────────────────────
// Every Monday reset forumPostsThisWeek counter; increment daysSinceLastPost
exports.weeklyBehaviourReset = require('firebase-functions/v2/scheduler')
  .onSchedule('every monday 00:00', async () => {
    const allBehaviour = await db.collection('userBehaviour').get()
    const batch        = db.batch()

    allBehaviour.docs.forEach(d => {
      const data = d.data()
      const lastPost   = data.lastPostDate?.toDate?.() || null
      const daysSince  = lastPost
        ? Math.floor((Date.now() - lastPost.getTime()) / 86400000)
        : (data.daysSinceLastPost || 0) + 7

      batch.update(d.ref, {
        forumPostsThisWeek: 0,
        daysSinceLastPost:  Math.min(daysSince, 99),
        updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
      })
    })

    await batch.commit()
    console.log(`[BAGE] Weekly behaviour reset complete for ${allBehaviour.size} users.`)
  })

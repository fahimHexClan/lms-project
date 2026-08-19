/**
 * BAGE — Behaviour-Adaptive Gamification Engine
 * Core Cloud Function: triggers on every write to userBehaviour/{userId}.
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')

const db = admin.firestore()

// ── Pattern definitions (Objective 8 — 5 core patterns) ────────────────────
const PATTERNS = [
  {
    type: 'late_submission',
    detect: (b) => (b.lateSubmissions || 0) >= 2,
    challenge: {
      title: 'Get back on track',
      description: 'Submit your next 2 assignments before their deadline.',
      bonusPoints: 25,
      badge: 'On-Track',
      expiryDays: 14,
    },
  },
  {
    type: 'broken_streak',
    detect: (b) => b.loginStreakBroken === true,
    challenge: {
      title: 'Rebuild your streak',
      description: 'Log in for 3 consecutive days to rebuild your login streak.',
      bonusPoints: 15,
      badge: 'Comeback',
      expiryDays: 7,
    },
  },
  {
    type: 'forum_inactive',
    detect: (b) => (b.daysSinceLastPost || 0) >= 7,
    challenge: {
      title: 'Join the conversation',
      description: 'Post 1 question or answer in the forum this week.',
      bonusPoints: 20,
      badge: 'Discussion Spark',
      expiryDays: 7,
    },
  },
  {
    type: 'mentor',
    detect: (b) => (b.onTimeSubmissions || 0) >= 3 && (b.lateSubmissions || 0) === 0,
    challenge: {
      title: 'Become a mentor',
      description: 'Answer 1 forum question this week to help a classmate.',
      bonusPoints: 30,
      badge: 'Mentor',
      expiryDays: 7,
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

    // ── Auto-complete any active challenges whose condition is now met ─────
    // This is what makes BAGE genuinely behaviour-driven: completion is
    // detected server-side from real Firestore data, never self-reported by
    // the client. A student cannot "claim" a challenge without actually
    // doing the underlying action.
    const activeSnap = await db.collection('challenges')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get()

    const completions = []
    activeSnap.docs.forEach(docSnap => {
      const ch = docSnap.data()
      const start = ch.startSnapshot || {}
      let satisfied = false

      switch (ch.type) {
        case 'late_submission':
          satisfied = (behaviour.onTimeSubmissions || 0) - (start.onTimeSubmissions || 0) >= 2
          break
        case 'broken_streak':
          satisfied = (behaviour.loginStreak || 0) >= 3
          break
        case 'forum_inactive':
          satisfied = (behaviour.forumPostsThisWeek || 0) - (start.forumPostsThisWeek || 0) >= 1
          break
        case 'mentor':
          satisfied = (behaviour.forumPostsThisWeek || 0) - (start.forumPostsThisWeek || 0) >= 1
          break
      }

      if (satisfied) {
        completions.push(
          docSnap.ref.update({ status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() }),
          db.collection('users').doc(userId).update({
            points: admin.firestore.FieldValue.increment(ch.bonusPoints),
            badges: admin.firestore.FieldValue.arrayUnion(ch.badge),
          })
        )
        console.log(`[BAGE] Auto-completed ${ch.type} for ${userId} — +${ch.bonusPoints}pts, badge "${ch.badge}"`)
      }
    })
    if (completions.length) await Promise.all(completions)

    // ── Direct-award milestones (no "challenge" step — unlocked the moment
    //    the underlying stat is reached) ────────────────────────────────────
    const userRef  = db.collection('users').doc(userId)
    const userSnap = await userRef.get()
    const userData = userSnap.exists ? userSnap.data() : {}
    const badgesHeld = userData.badges || []
    const directAwards = []

    // Week Warrior — 7-day login streak
    if ((behaviour.loginStreak || 0) === 7 && !badgesHeld.includes('Week Warrior')) {
      directAwards.push(
        userRef.update({
          points: admin.firestore.FieldValue.increment(50),
          badges: admin.firestore.FieldValue.arrayUnion('Week Warrior'),
        }),
        db.collection('milestones').doc(`${userId}_7day_${Date.now()}`).set({
          userId, type: 'login_streak_7', badge: 'Week Warrior',
          pointsAwarded: 50, awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      )
      console.log(`[BAGE] Week Warrior milestone awarded to ${userId}`)
    }

    // First Submit — the student's very first assignment submission
    const totalSubmissions = (behaviour.onTimeSubmissions || 0) + (behaviour.lateSubmissions || 0)
    if (totalSubmissions === 1 && !badgesHeld.includes('First Submit')) {
      directAwards.push(
        userRef.update({
          points: admin.firestore.FieldValue.increment(10),
          badges: admin.firestore.FieldValue.arrayUnion('First Submit'),
        })
      )
      console.log(`[BAGE] First Submit badge awarded to ${userId}`)
    }

    // Forum Star — 10 lifetime forum posts (totalForumPosts is a running
    // counter incremented client-side on every thread/reply; separate from
    // forumPostsThisWeek, which resets weekly for the forum_inactive pattern)
    if ((behaviour.totalForumPosts || 0) >= 10 && !badgesHeld.includes('Forum Star')) {
      directAwards.push(
        userRef.update({
          points: admin.firestore.FieldValue.increment(25),
          badges: admin.firestore.FieldValue.arrayUnion('Forum Star'),
        })
      )
      console.log(`[BAGE] Forum Star badge awarded to ${userId}`)
    }

    // Perfect Week — on-time submission AND a forum post AND a 7-day login
    // streak, all true at once (i.e. the student is active across every
    // engagement channel in the same week)
    const perfectWeek = (behaviour.loginStreak || 0) >= 7
      && (behaviour.forumPostsThisWeek || 0) >= 1
      && (behaviour.onTimeSubmissions || 0) >= 1
      && (behaviour.lateSubmissions || 0) === 0
    if (perfectWeek && !badgesHeld.includes('Perfect Week')) {
      directAwards.push(
        userRef.update({
          points: admin.firestore.FieldValue.increment(40),
          badges: admin.firestore.FieldValue.arrayUnion('Perfect Week'),
        })
      )
      console.log(`[BAGE] Perfect Week badge awarded to ${userId}`)
    }

    if (directAwards.length) await Promise.all(directAwards)

    // ── Patterns 1–4: evaluate and write challenges ────────────────────────
    const promises = []

    for (const pattern of PATTERNS) {
      if (!pattern.detect(behaviour)) continue

      const challengeRef = db.collection('challenges').doc(`${userId}_${pattern.type}`)
      const existing     = await challengeRef.get()

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
          startSnapshot: {
            onTimeSubmissions:  behaviour.onTimeSubmissions  || 0,
            forumPostsThisWeek: behaviour.forumPostsThisWeek || 0,
            loginStreak:        behaviour.loginStreak        || 0,
          },
        })
      )
      console.log(`[BAGE] Challenge triggered: ${pattern.type} for user ${userId}`)
    }

    if (promises.length) await Promise.all(promises)
    return null
  }
)

// ── Scheduled: expire stale challenges past their deadline ─────────────────
exports.expireChallenges = require('firebase-functions/v2/scheduler')
  .onSchedule('every 24 hours', async () => {
    const now = new Date()
    const snap = await db.collection('challenges')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', now)
      .get()

    const batch = db.batch()
    snap.docs.forEach(d => batch.update(d.ref, { status: 'expired' }))
    if (!snap.empty) await batch.commit()
    console.log(`[BAGE] Expired ${snap.size} stale challenge(s)`)
  })

// ── Scheduled: reset weekly counters every Monday ───────────────────────────
exports.weeklyBehaviourReset = require('firebase-functions/v2/scheduler')
  .onSchedule('every monday 00:00', async () => {
    const snap = await db.collection('userBehaviour').get()
    const batch = db.batch()
    snap.docs.forEach(d => batch.update(d.ref, {
      forumPostsThisWeek: 0,
      daysSinceLastPost: admin.firestore.FieldValue.increment(0),
    }))
    if (!snap.empty) await batch.commit()
    console.log(`[BAGE] Weekly counters reset for ${snap.size} student(s)`)
  })
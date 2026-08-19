/**
 * Auth trigger — runs when a user signs in.
 * Updates login streak and last login date in userBehaviour + users.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * updateLoginStreak — HTTPS Callable
 * Client calls this once per session (from AuthContext, right after sign-in).
 * The uid comes from the verified Firebase Auth token (context.auth), never
 * from client-supplied input — this closes the trust gap the old onRequest
 * version had (anyone could previously POST an arbitrary uid).
 * Updates loginStreak, lastLogin, and (for students) triggers BAGE via the
 * userBehaviour document write.
 */
exports.updateLoginStreak = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }

  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'User profile not found.')
  }
  const userData = userSnap.data()
  const now = new Date()

  // Only students are tracked by BAGE / earn gamification points on login.
  // Lecturers/Admins still get lastLogin updated but no streak/points logic.
  if (userData.role !== 'student') {
    await userRef.update({ lastLogin: admin.firestore.FieldValue.serverTimestamp() })
    return { tracked: false }
  }

  const behaviourRef = db.collection('userBehaviour').doc(uid)
  const behaviourSnap = await behaviourRef.get()
  if (!behaviourSnap.exists) {
    throw new HttpsError('not-found', 'Behaviour profile not found.')
  }

  const behaviour = behaviourSnap.data()
  const lastLogin = behaviour.lastLoginDate?.toDate?.() || null

  let loginStreak       = behaviour.loginStreak || 0
  let loginStreakBroken = false
  let previousStreak    = behaviour.previousStreak || 0

  if (lastLogin) {
    const daysSince = (now - lastLogin) / 86400000
    if (daysSince < 1) {
      // Same calendar session — no change
    } else if (daysSince < 2) {
      // Logged in on a consecutive day
      loginStreak += 1
    } else {
      // Gap of more than a day — streak broken
      loginStreakBroken = true
      previousStreak    = loginStreak
      loginStreak       = 1
    }
  } else {
    // First login ever
    loginStreak = 1
  }

  // Update behaviour doc — this write is what triggers the BAGE engine
  await behaviourRef.update({
    loginStreak,
    loginStreakBroken,
    previousStreak,
    lastLoginDate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
  })

  // Update user doc — mirror streak, award small daily login points
  await userRef.update({
    loginStreak,
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    points: admin.firestore.FieldValue.increment(2),
  })

  return { tracked: true, loginStreak, loginStreakBroken, previousStreak }
})
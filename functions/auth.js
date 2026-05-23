/**
 * Auth trigger — runs when a user signs in.
 * Updates login streak and last login date in userBehaviour.
 */

const { onRequest } = require('firebase-functions/v2/https')
const { beforeUserSignedIn } = require('firebase-functions/v2/identity')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * NOTE: Firebase doesn't have a native "onSignIn" trigger.
 * Login tracking is handled client-side in AuthContext.jsx when onAuthStateChanged fires.
 * This function provides a callable endpoint the client can call to update streak securely.
 */
exports.onUserCreated = require('firebase-functions/v2/identity')
  .beforeUserCreated(async (event) => {
    // Called when a new Firebase Auth user is created.
    // The Firestore user doc is written by AuthContext.register() on the client.
    // This function can be used for additional setup if needed.
    console.log(`[AUTH] New user created: ${event.data.uid}`)
    return
  })

/**
 * updateLoginStreak — HTTPS Callable
 * Client calls this each time the user logs in (from AuthContext).
 * Updates loginStreak, lastLogin, and triggers BAGE via the behaviour doc.
 */
exports.updateLoginStreak = onRequest(
  { cors: true },
  async (req, res) => {
    // Basic auth check — expect uid in body
    const { uid } = req.body
    if (!uid) return res.status(400).json({ error: 'uid required' })

    try {
      const behaviourRef = db.collection('userBehaviour').doc(uid)
      const userRef      = db.collection('users').doc(uid)

      const [behaviourSnap, userSnap] = await Promise.all([
        behaviourRef.get(),
        userRef.get(),
      ])

      if (!behaviourSnap.exists || !userSnap.exists) {
        return res.status(404).json({ error: 'User not found' })
      }

      const behaviour   = behaviourSnap.data()
      const now         = new Date()
      const lastLogin   = behaviour.lastLoginDate?.toDate?.() || null

      let loginStreak     = behaviour.loginStreak || 0
      let loginStreakBroken = false
      let previousStreak  = behaviour.previousStreak || 0

      if (lastLogin) {
        const msSince = now - lastLogin
        const daysSince = msSince / 86400000

        if (daysSince < 1) {
          // Same day — no change to streak
        } else if (daysSince < 2) {
          // Consecutive day — increment streak
          loginStreak += 1
        } else {
          // Streak broken
          loginStreakBroken = true
          previousStreak    = loginStreak
          loginStreak       = 1
        }
      } else {
        // First login
        loginStreak = 1
      }

      // Update behaviour doc (BAGE trigger fires on this write)
      await behaviourRef.update({
        loginStreak,
        loginStreakBroken,
        previousStreak,
        lastLoginDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
      })

      // Update user doc
      await userRef.update({
        loginStreak,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        // Award base daily login points
        points: admin.firestore.FieldValue.increment(2),
      })

      return res.json({ loginStreak, loginStreakBroken, previousStreak })
    } catch (err) {
      console.error('[AUTH] updateLoginStreak error:', err)
      return res.status(500).json({ error: 'Internal error' })
    }
  }
)

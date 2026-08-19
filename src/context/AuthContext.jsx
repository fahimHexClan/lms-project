import { createContext, useContext, useEffect, useState } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  getAuth,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions, firebaseConfig } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) {
            setRole(snap.data().role)
          } else {
            console.warn('User doc missing in Firestore for uid:', firebaseUser.uid)
          }
          setUser(firebaseUser)

          // Update login streak once per browser session (feeds the BAGE
          // engine's broken_streak pattern and the 7-day milestone badge).
          const flag = `streakSynced_${firebaseUser.uid}`
          if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, '1')
            httpsCallable(functions, 'updateLoginStreak')().catch(err => {
              console.error('Login streak update failed:', err)
            })
          }
        } else {
          setUser(null)
          setRole(null)
        }
      } catch (err) {
        console.error('Auth/Firestore error:', err)
        setUser(null)
        setRole(null)
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const logout = () => signOut(auth)

  // Admin uses this to register new users.
  // IMPORTANT: createUserWithEmailAndPassword on the default `auth` instance
  // would sign the admin OUT and sign the new user IN instead (a well-known
  // Firebase client-SDK behaviour). To avoid hijacking the admin's session,
  // we spin up a short-lived secondary Firebase app just for this call, then
  // tear it down — the admin's own `auth` session is never touched.
  const register = async (email, password, role, displayName, batch = '', module = '') => {
    const secondaryApp  = initializeApp(firebaseConfig, `secondary-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email,
        displayName,
        role,           // 'student' | 'lecturer' | 'admin'
        batch:  batch.trim(),   // e.g. "Cohort 8" — used to target content/assignments/events
        module: module.trim(),  // e.g. "COM6301"  — used to target content/assignments/events
        points: 0,
        badges: [],
        loginStreak: 0,
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
      // Initialise behaviour doc for students
      if (role === 'student') {
        await setDoc(doc(db, 'userBehaviour', cred.user.uid), {
          userId: cred.user.uid,
          lateSubmissions: 0,
          onTimeSubmissions: 0,
          loginStreak: 0,
          loginStreakBroken: false,
          previousStreak: 0,
          lastLoginDate: null,
          forumPostsThisWeek: 0,
          daysSinceLastPost: 0,
          lastPostDate: null,
          updatedAt: serverTimestamp(),
        })
      }

      await signOut(secondaryAuth) // sign the new user out of the secondary session
      return cred
    } finally {
      await deleteApp(secondaryApp) // clean up — no trace left, admin session untouched
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, register }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
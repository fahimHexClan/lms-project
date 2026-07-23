import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

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

  // Admin uses this to register new users
  const register = async (email, password, role, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      role,           // 'student' | 'lecturer' | 'admin'
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
    return cred
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, register }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
import { useState, useEffect, createContext, useContext } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          let profile = {}
          try {
            const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
            profile = snap.data() || {}
          } catch (_) {}
          setUser({ ...firebaseUser, profile })
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider)
    try { await ensureUserDoc(result.user) } catch (_) {}
    return result.user
  }

  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  async function registerWithEmail(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    try { await ensureUserDoc(result.user, { displayName: name }) } catch (_) {}
    return result.user
  }

  async function logout() {
    await signOut(auth)
  }

  async function ensureUserDoc(firebaseUser, extra = {}) {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || extra.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        createdAt: serverTimestamp(),
        plan: 'free',
      })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

import { useState, useEffect, createContext, useContext } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await ensureUserDoc(firebaseUser)
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          setUser({ ...firebaseUser, profile: snap.data() || {} })
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
    return result.user
  }

  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  async function registerWithEmail(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    return result.user
  }

  async function logout() {
    await signOut(auth)
  }

  async function claimInvite(inviteId) {
    if (!user) throw new Error('Debes iniciar sesión primero')
    const inviteRef = doc(db, 'invites', inviteId)
    const inviteSnap = await getDoc(inviteRef)
    if (!inviteSnap.exists()) throw new Error('Invitación no encontrada o expirada')
    const invite = inviteSnap.data()
    if (invite.claimed) throw new Error('Esta invitación ya fue utilizada')
    if (invite.expiresAt?.toDate() < new Date()) throw new Error('La invitación ha expirado')

    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, {
      orgId: invite.orgId,
      role: invite.role,
      invitedBy: invite.createdBy,
      joinedAt: serverTimestamp(),
    })
    await updateDoc(inviteRef, {
      claimed: true,
      claimedBy: user.uid,
      claimedAt: serverTimestamp(),
    })
    const snap = await getDoc(userRef)
    setUser(prev => ({ ...prev, profile: snap.data() }))
  }

  async function ensureUserDoc(firebaseUser, extra = {}) {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      const orgId = firebaseUser.uid
      await setDoc(doc(db, 'organizations', orgId), {
        name: extra.displayName || firebaseUser.displayName || firebaseUser.email || 'Mi organización',
        ownerId: firebaseUser.uid,
        createdAt: serverTimestamp(),
      })
      await setDoc(ref, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || extra.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        orgId,
        role: 'admin',
        createdAt: serverTimestamp(),
        plan: 'free',
      })
    } else {
      const data = snap.data()
      if (!data.orgId) {
        const orgId = firebaseUser.uid
        await setDoc(doc(db, 'organizations', orgId), {
          name: data.displayName || firebaseUser.displayName || 'Mi organización',
          ownerId: firebaseUser.uid,
          createdAt: serverTimestamp(),
        }, { merge: true })
        await updateDoc(ref, { orgId, role: 'admin' })
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout, claimInvite }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

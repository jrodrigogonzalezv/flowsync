import { useState, useRef } from 'react'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Camera, Loader2, Check, User, Mail, Shield, Lock, Eye, EyeOff } from 'lucide-react'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const [name, setName] = useState(user?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const isGoogleUser = user?.providerData?.some(p => p.providerId === 'google.com')

  async function handleSaveProfile() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() })
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name.trim(),
        updatedAt: serverTimestamp(),
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La imagen debe pesar menos de 5 MB'); return }
    setPhotoUploading(true); setError('')
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/photo`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateProfile(auth.currentUser, { photoURL: url })
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() })
      await refreshProfile()
    } catch (e) {
      setError(e.message || 'Error al subir la imagen')
    } finally {
      setPhotoUploading(false)
    }
  }

  const currentPhoto = auth.currentUser?.photoURL || user?.photoURL

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Mi perfil</h2>
        <p className="text-slate-500 text-sm mt-1">Edita tu nombre, foto y contraseña.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-6">
        {/* Photo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Foto de perfil</h3>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {currentPhoto ? (
                <img src={currentPhoto} alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-slate-200" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-800 flex items-center justify-center text-3xl font-bold text-white">
                  {user?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              {photoUploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {photoUploading ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              <p className="text-xs text-slate-400 mt-1.5">JPG, PNG o WebP · Máx 5 MB</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Información personal</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                  placeholder="Tu nombre"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full pl-10 border border-slate-200 text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">El email no se puede cambiar.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Rol</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Shield className="w-4 h-4 text-blue-800" />
                <span className="text-sm text-slate-700 font-medium capitalize">
                  {user?.profile?.role === 'admin' ? 'Administrador' : 'Supervisor'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar cambios'}
              </button>
              {saved && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <Check className="w-4 h-4" /> Guardado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Password - only for email users */}
        {!isGoogleUser && <ChangePasswordSection onError={setError} />}
      </div>
    </div>
  )
}

function ChangePasswordSection({ onError }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  async function handleChange() {
    if (!current || !next) return
    if (next.length < 6) { setErr('La nueva contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true); setErr('')
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, current)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, next)
      setCurrent(''); setNext('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      const msg = e.code === 'auth/wrong-password' ? 'Contraseña actual incorrecta' : e.message
      setErr(msg)
      onError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Cambiar contraseña</h3>
      <div className="space-y-4">
        {[
          { label: 'Contraseña actual', val: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
          { label: 'Nueva contraseña', val: next, set: setNext, show: showNext, toggle: () => setShowNext(v => !v) },
        ].map(({ label, val, set, show, toggle }) => (
          <div key={label}>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">{label}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={show ? 'text' : 'password'}
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full pl-10 pr-10 border border-slate-300 text-slate-900 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
              />
              <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleChange}
            disabled={saving || !current || !next}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Cambiar contraseña'}
          </button>
          {saved && <span className="text-emerald-600 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Cambiada</span>}
        </div>
      </div>
    </div>
  )
}

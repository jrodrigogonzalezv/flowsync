import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Upload, Loader2, Check, Building2, Globe, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const orgId = user?.profile?.orgId || user?.uid
  const [org, setOrg] = useState(null)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    if (!orgId) return
    getDoc(doc(db, 'organizations', orgId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setOrg(d)
        setName(d.name || '')
        setWebsite(d.website || '')
      }
    })
  }, [orgId])

  async function handleSave() {
    setSaving(true); setError('')
    try {
      await setDoc(doc(db, 'organizations', orgId), {
        name: name.trim(),
        website: website.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setOrg(prev => ({ ...prev, name: name.trim(), website: website.trim() }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('El logo debe pesar menos de 5 MB'); return }
    setLogoUploading(true); setError('')
    try {
      const storageRef = ref(storage, `orgs/${orgId}/logo`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await setDoc(doc(db, 'organizations', orgId), { logoUrl: url, updatedAt: serverTimestamp() }, { merge: true })
      setOrg(prev => ({ ...prev, logoUrl: url }))
    } catch (e) {
      setError(e.message || 'Error al subir el logo')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleRemoveLogo() {
    await setDoc(doc(db, 'organizations', orgId), { logoUrl: null }, { merge: true })
    setOrg(prev => ({ ...prev, logoUrl: null }))
  }

  const planLabel = user?.profile?.plan === 'pro' ? 'Pro' : 'Gratuito'

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>
        <p className="text-slate-500 text-sm mt-1">Personaliza tu organización.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-6">
        {/* Logo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Logo de la organización</h3>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {org?.logoUrl ? (
                <img src={org.logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-contain border border-slate-200 p-1 bg-white" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-300" />
                </div>
              )}
              {logoUploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {logoUploading ? 'Subiendo...' : 'Subir logo'}
              </button>
              {org?.logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Quitar logo
                </button>
              )}
              <p className="text-xs text-slate-400">JPG, PNG o SVG · Máx 5 MB</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </div>
          </div>
        </div>

        {/* Org info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Información de la organización</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre de la organización</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 border border-slate-300 text-slate-900 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                  placeholder="Tu empresa o marca"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Sitio web (opcional)</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="w-full pl-10 border border-slate-300 text-slate-900 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                  placeholder="https://tuempresa.com"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSave}
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

        {/* Plan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Plan actual</h3>
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div>
              <p className="font-semibold text-blue-900">Plan {planLabel}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {user?.profile?.plan === 'pro'
                  ? 'Acceso completo a todas las funciones'
                  : 'Flujos ilimitados · Clientes ilimitados'}
              </p>
            </div>
            {user?.profile?.plan !== 'pro' && (
              <span className="text-xs bg-blue-800 text-white px-3 py-1.5 rounded-full font-medium">Gratis</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { Loader2, Camera, User, Building2 } from 'lucide-react'

export default function ClientProfileForm({ execution, onComplete }) {
  const [type, setType] = useState('natural')
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name: execution.clientName || '',
    phone: '',
    rut: '',
    address: '',
    companyName: '',
    companyRut: '',
    industry: '',
    position: '',
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let photoUrl = null
      if (photoFile) {
        const sanitized = execution.clientEmail.replace(/[.@+]/g, '_')
        const storageRef = ref(storage, `profiles/clients/${execution.orgId}/${sanitized}`)
        await uploadBytes(storageRef, photoFile)
        photoUrl = await getDownloadURL(storageRef)
      }

      const profileData = {
        orgId: execution.orgId,
        email: execution.clientEmail,
        name: form.name.trim() || execution.clientName,
        phone: form.phone.trim(),
        rut: form.rut.trim(),
        address: form.address.trim(),
        type,
        ...(type === 'juridica' && {
          companyName: form.companyName.trim(),
          companyRut: form.companyRut.trim(),
          industry: form.industry.trim(),
          position: form.position.trim(),
        }),
        ...(photoUrl && { photoUrl }),
        updatedAt: serverTimestamp(),
      }

      const q = query(
        collection(db, 'clients'),
        where('orgId', '==', execution.orgId),
        where('email', '==', execution.clientEmail)
      )
      const existing = await getDocs(q)
      if (!existing.empty) {
        await updateDoc(doc(db, 'clients', existing.docs[0].id), profileData)
      } else {
        await addDoc(collection(db, 'clients'), { ...profileData, createdAt: serverTimestamp() })
      }
    } catch (err) {
      console.error('Error saving profile:', err)
    } finally {
      setSaving(false)
      onComplete()
    }
  }

  const inputClass = "w-full border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400 bg-white"

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Type toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {[
          { value: 'natural', label: 'Persona natural', icon: <User className="w-4 h-4" /> },
          { value: 'juridica', label: 'Empresa', icon: <Building2 className="w-4 h-4" /> },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              type === opt.value
                ? 'bg-white text-blue-800 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Photo / Logo */}
      <div className="flex flex-col items-center">
        <input type="file" ref={fileRef} accept="image/*" onChange={handlePhoto} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center overflow-hidden transition-colors group"
        >
          {photoPreview
            ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
            : (
              <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-500">
                <Camera className="w-6 h-6" />
                <span className="text-[10px]">{type === 'juridica' ? 'Logo' : 'Foto'}</span>
              </div>
            )
          }
        </button>
        <p className="text-xs text-slate-400 mt-1.5">Opcional</p>
      </div>

      {type === 'natural' ? (
        <>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre completo</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} placeholder="Tu nombre completo" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">RUT</label>
            <input value={form.rut} onChange={e => set('rut', e.target.value)} className={inputClass} placeholder="12.345.678-9" />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre de la empresa</label>
            <input value={form.companyName} onChange={e => set('companyName', e.target.value)} className={inputClass} placeholder="Razón social" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">RUT empresa</label>
            <input value={form.companyRut} onChange={e => set('companyRut', e.target.value)} className={inputClass} placeholder="76.543.210-K" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Rubro</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)} className={inputClass} placeholder="Ej: Tecnología, Retail, Servicios..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre del representante</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} placeholder="Nombre y apellido" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Cargo</label>
            <input value={form.position} onChange={e => set('position', e.target.value)} className={inputClass} placeholder="Ej: Gerente, Fundador, Director..." />
          </div>
        </>
      )}

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1.5">Teléfono</label>
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="+56 9 1234 5678" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1.5">Ciudad / Región</label>
        <input value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} placeholder="Ej: Santiago, Región Metropolitana" />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Guardando...' : 'Comenzar proceso →'}
      </button>
    </form>
  )
}

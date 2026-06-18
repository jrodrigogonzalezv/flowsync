import { useState, useRef } from 'react'
import { collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { Loader2, Camera, User, Building2 } from 'lucide-react'

const REGIONES_CHILE = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  "Región del Libertador General Bernardo O'Higgins",
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén del General Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
]

export default function ClientProfileForm({ execution, onComplete }) {
  const [type, setType] = useState('natural')
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    phone: '',
    rut: '',
    street: '',
    streetNumber: '',
    apt: '',
    city: '',
    region: '',
    country: 'Chile',
    birthDate: '',
    gender: '',
    nationality: 'Chilena',
    companyName: '',
    companyRut: '',
    companyRepFirstName: '',
    companyRepLastName: '',
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

      const firstName = form.firstName.trim()
      const paternalLastName = form.paternalLastName.trim()
      const maternalLastName = form.maternalLastName.trim()
      const derivedName = [firstName, paternalLastName, maternalLastName].filter(Boolean).join(' ')
        || execution.clientName

      const derivedAddress = [
        form.street.trim(),
        form.streetNumber.trim(),
        form.apt.trim() ? `Dpto. ${form.apt.trim()}` : '',
        form.city.trim(),
        form.region.trim(),
        form.country.trim(),
      ].filter(Boolean).join(', ')

      const repFirstName = form.companyRepFirstName.trim()
      const repLastName = form.companyRepLastName.trim()
      const repName = [repFirstName, repLastName].filter(Boolean).join(' ')

      const profileData = {
        orgId: execution.orgId,
        email: execution.clientEmail,
        // backward-compatible flat fields
        name: type === 'juridica' && repName ? repName : derivedName,
        address: derivedAddress,
        // structured name fields
        firstName: type === 'juridica' ? repFirstName : firstName,
        paternalLastName: type === 'juridica' ? repLastName : paternalLastName,
        maternalLastName: type === 'juridica' ? '' : maternalLastName,
        // contact
        phone: form.phone.trim(),
        rut: form.rut.trim(),
        // structured address
        addressStreet: form.street.trim(),
        addressNumber: form.streetNumber.trim(),
        addressApt: form.apt.trim(),
        addressCity: form.city.trim(),
        addressRegion: form.region.trim(),
        addressCountry: form.country.trim(),
        // personal extras (persona natural only)
        birthDate: type === 'natural' ? (form.birthDate || null) : null,
        gender: type === 'natural' ? (form.gender || null) : null,
        nationality: type === 'natural' ? (form.nationality.trim() || null) : null,
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

  const inputCls = "w-full border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400 bg-white"
  const labelCls = "text-xs font-medium text-slate-600 block mb-1.5"
  const sectionCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-1"

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

      {/* Persona natural */}
      {type === 'natural' ? (
        <>
          <div>
            <label className={labelCls}>Nombre <span className="text-red-400">*</span></label>
            <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} placeholder="Tu nombre" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Apellido paterno <span className="text-red-400">*</span></label>
              <input value={form.paternalLastName} onChange={e => set('paternalLastName', e.target.value)} className={inputCls} placeholder="Ap. paterno" required />
            </div>
            <div>
              <label className={labelCls}>Apellido materno</label>
              <input value={form.maternalLastName} onChange={e => set('maternalLastName', e.target.value)} className={inputCls} placeholder="Ap. materno" />
            </div>
          </div>
          <div>
            <label className={labelCls}>RUT</label>
            <input value={form.rut} onChange={e => set('rut', e.target.value)} className={inputCls} placeholder="12.345.678-9" />
          </div>
        </>
      ) : (
        /* Empresa */
        <>
          <div>
            <label className={labelCls}>Razón social <span className="text-red-400">*</span></label>
            <input value={form.companyName} onChange={e => set('companyName', e.target.value)} className={inputCls} placeholder="Nombre de la empresa" required />
          </div>
          <div>
            <label className={labelCls}>RUT empresa</label>
            <input value={form.companyRut} onChange={e => set('companyRut', e.target.value)} className={inputCls} placeholder="76.543.210-K" />
          </div>
          <div>
            <label className={labelCls}>Rubro</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)} className={inputCls} placeholder="Ej: Tecnología, Retail, Servicios..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre representante</label>
              <input value={form.companyRepFirstName} onChange={e => set('companyRepFirstName', e.target.value)} className={inputCls} placeholder="Nombre" />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input value={form.companyRepLastName} onChange={e => set('companyRepLastName', e.target.value)} className={inputCls} placeholder="Apellido" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input value={form.position} onChange={e => set('position', e.target.value)} className={inputCls} placeholder="Ej: Gerente, Fundador, Director..." />
          </div>
        </>
      )}

      {/* Teléfono */}
      <div>
        <label className={labelCls}>Teléfono</label>
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+56 9 1234 5678" />
      </div>

      {/* Domicilio */}
      <div>
        <p className={sectionCls}>Domicilio</p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Calle</label>
              <input value={form.street} onChange={e => set('street', e.target.value)} className={inputCls} placeholder="Av. Providencia" />
            </div>
            <div className="w-28">
              <label className={labelCls}>Número</label>
              <input value={form.streetNumber} onChange={e => set('streetNumber', e.target.value)} className={inputCls} placeholder="1234" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Depto / Oficina</label>
              <input value={form.apt} onChange={e => set('apt', e.target.value)} className={inputCls} placeholder="101" />
            </div>
            <div>
              <label className={labelCls}>Ciudad</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} placeholder="Santiago" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Región</label>
            <select value={form.region} onChange={e => set('region', e.target.value)} className={inputCls}>
              <option value="">Selecciona una región</option>
              {REGIONES_CHILE.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>País</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} placeholder="Chile" />
          </div>
        </div>
      </div>

      {/* Datos adicionales (solo persona natural) */}
      {type === 'natural' && (
        <div>
          <p className={sectionCls}>Datos adicionales</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha de nacimiento</label>
                <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Género</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                  <option value="">Prefiero no indicar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="No binario">No binario</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Nacionalidad</label>
              <input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inputCls} placeholder="Chilena" />
            </div>
          </div>
        </div>
      )}

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

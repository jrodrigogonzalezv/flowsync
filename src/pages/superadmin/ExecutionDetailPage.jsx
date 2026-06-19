import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getDoc, getDocs, doc, collection, query, where,
} from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { ArrowLeft, User, FileText, ExternalLink } from 'lucide-react'
import { NODE_TYPES_CONFIG } from '../../components/builder/nodes/nodeTypes'

const STATUS_CONFIG = {
  invited:     { label: 'Invitado',     bg: 'bg-slate-100',   text: 'text-slate-600'   },
  in_progress: { label: 'En progreso',  bg: 'bg-blue-100',    text: 'text-blue-700'    },
  completed:   { label: 'Completado',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  review:      { label: 'En revisión',  bg: 'bg-amber-100',   text: 'text-amber-700'   },
  archived:    { label: 'Archivado',    bg: 'bg-slate-100',   text: 'text-slate-400'   },
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function ResponseSection({ nodeId, responseData, workflow }) {
  const node = (workflow?.nodes || []).find(n => n.id === nodeId)
  const conf = NODE_TYPES_CONFIG[node?.type] || {}
  const label = node?.data?.label || `Nodo ${nodeId.slice(0, 6)}`
  const fields = node?.data?.fields || []

  const isDecision = node?.type === 'decision'
  const isForm = node?.type === 'form'

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className={`px-4 py-2.5 flex items-center gap-2 ${conf.bgLight || 'bg-slate-50'}`}>
        <span className="text-sm">{conf.icon || '📌'}</span>
        <span className={`text-xs font-semibold ${conf.textColor || 'text-slate-600'}`}>{conf.label || node?.type}</span>
        <span className="text-sm font-medium text-slate-900 ml-1">{label}</span>
      </div>
      <div className="px-4 py-3 bg-white space-y-2">
        {isDecision && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Opción elegida:</span>
            <span className="text-sm font-medium text-slate-900">
              {responseData?.chosenOptionLabel || responseData?.chosenOptionId || '—'}
            </span>
          </div>
        )}
        {isForm && typeof responseData === 'object' && !isDecision && (
          Object.entries(responseData).map(([fieldId, value]) => {
            const field = fields.find(f => f.id === fieldId)
            return (
              <div key={fieldId} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-slate-500">{field?.label || fieldId}</span>
                <span className="text-sm text-slate-900 whitespace-pre-wrap">{formatValue(value)}</span>
              </div>
            )
          })
        )}
        {!isDecision && !isForm && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{formatValue(responseData)}</p>
        )}
      </div>
    </div>
  )
}

function ProfileField({ label, value, span = false }) {
  if (!value) return null
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  )
}

export default function ExecutionDetailPage() {
  const { orgId, execId } = useParams()
  const navigate = useNavigate()
  const [execution, setExecution] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [profile, setProfile] = useState(null)
  const [docUrls, setDocUrls] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const exResult = await Promise.allSettled([getDoc(doc(db, 'executions', execId))])
      const exSnap = exResult[0].status === 'fulfilled' ? exResult[0].value : null
      if (!exSnap?.exists()) { setLoading(false); return }

      const ex = { id: exSnap.id, ...exSnap.data() }
      setExecution(ex)

      const [wfResult, profileResult] = await Promise.allSettled([
        ex.workflowId ? getDoc(doc(db, 'workflows', ex.workflowId)) : Promise.resolve(null),
        ex.clientEmail && ex.orgId
          ? getDocs(query(collection(db, 'clients'), where('orgId', '==', ex.orgId), where('email', '==', ex.clientEmail)))
          : Promise.resolve(null),
      ])

      if (wfResult.status === 'fulfilled' && wfResult.value?.exists())
        setWorkflow({ id: wfResult.value.id, ...wfResult.value.data() })
      if (profileResult.status === 'fulfilled' && profileResult.value && !profileResult.value.empty)
        setProfile(profileResult.value.docs[0].data())

      const docs = ex.uploadedDocs || []
      if (docs.length > 0) {
        const urlMap = {}
        await Promise.allSettled(
          docs.map(async d => {
            try {
              const url = await getDownloadURL(ref(storage, d.storagePath))
              urlMap[d.storagePath] = url
            } catch { /* storage path may be invalid */ }
          })
        )
        setDocUrls(urlMap)
      }

      setLoading(false)
    }
    load()
  }, [execId, orgId])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!execution) return (
    <div className="p-6 text-center text-slate-400">Ejecución no encontrada.</div>
  )

  const status = STATUS_CONFIG[execution.archived ? 'archived' : execution.status] || STATUS_CONFIG.invited
  const responses = execution.responses || {}
  const responseEntries = Object.entries(responses)
  const uploadedDocs = execution.uploadedDocs || []
  const history = execution.navigationHistory || []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(`/superadmin/org/${orgId}`)}
          className="mt-0.5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{execution.clientName}</h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {execution.clientEmail} · Flujo: {execution.workflowName} · {formatDate(execution.createdAt)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Progreso</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-blue-800 rounded-full transition-all"
              style={{ width: `${execution.totalNodes ? Math.round((execution.completedNodes || 0) / execution.totalNodes * 100) : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-700 flex-shrink-0">
            {execution.completedNodes || 0} / {execution.totalNodes || '?'} pasos
          </span>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-400">
          <span>Creado: {formatDate(execution.createdAt)}</span>
          {execution.updatedAt && <span>Última actividad: {formatDate(execution.updatedAt)}</span>}
        </div>
      </div>

      {/* Client profile */}
      {profile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" /> Perfil del cliente
          </h2>

          {/* Avatar + type badge */}
          <div className="flex items-center gap-4 mb-5">
            {(profile.photoUrl || profile.photoURL) ? (
              <img src={profile.photoUrl || profile.photoURL} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-800 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {([profile.firstName, profile.name, profile.displayName, profile.email].find(Boolean) || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-slate-900">
                {[profile.firstName, profile.paternalLastName, profile.maternalLastName].filter(Boolean).join(' ')
                  || profile.name || profile.displayName || profile.email}
              </p>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                profile.type === 'juridica' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {profile.type === 'juridica' ? 'Empresa' : 'Persona natural'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Common fields */}
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="Teléfono" value={profile.phone} />
            <ProfileField label="RUT" value={profile.rut} />

            {/* Persona natural extras */}
            {profile.type === 'natural' && <>
              <ProfileField label="Fecha de nacimiento" value={profile.birthDate} />
              <ProfileField label="Género" value={profile.gender} />
              <ProfileField label="Nacionalidad" value={profile.nationality} />
            </>}

            {/* Empresa fields */}
            {profile.type === 'juridica' && <>
              <ProfileField label="Razón social" value={profile.companyName} span />
              <ProfileField label="RUT empresa" value={profile.companyRut} />
              <ProfileField label="Rubro" value={profile.industry} />
              <ProfileField label="Representante" value={[profile.firstName, profile.paternalLastName].filter(Boolean).join(' ') || null} />
              <ProfileField label="Cargo" value={profile.position} />
            </>}

            {/* Structured address */}
            {(profile.addressStreet || profile.address) && (
              <ProfileField
                label="Domicilio"
                span
                value={
                  profile.addressStreet
                    ? [
                        [profile.addressStreet, profile.addressNumber].filter(Boolean).join(' '),
                        profile.addressApt ? `Dpto. ${profile.addressApt}` : '',
                        profile.addressCity,
                        profile.addressRegion,
                        profile.addressCountry,
                      ].filter(Boolean).join(', ')
                    : profile.address
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Responses */}
      {responseEntries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Respuestas por nodo</h2>
          <div className="space-y-3">
            {responseEntries.map(([nodeId, data]) => (
              <ResponseSection key={nodeId} nodeId={nodeId} responseData={data} workflow={workflow} />
            ))}
          </div>
        </div>
      )}

      {/* Uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Documentos subidos ({uploadedDocs.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {uploadedDocs.map((d, i) => {
              const url = docUrls[d.storagePath]
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium truncate">{d.name || d.fileName || `Documento ${i + 1}`}</p>
                    {d.size && <p className="text-xs text-slate-400">{Math.round(d.size / 1024)} KB</p>}
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium flex-shrink-0"
                    >
                      Descargar <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation history */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Historial de navegación</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {history.map((h, i) => {
              const conf = NODE_TYPES_CONFIG[h.nodeType] || {}
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-sm">{conf.icon || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-800 font-medium">{h.label}</span>
                    {h.chosenOptionLabel && (
                      <span className="text-xs text-slate-400 ml-2">→ {h.chosenOptionLabel}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {h.at ? new Date(h.at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

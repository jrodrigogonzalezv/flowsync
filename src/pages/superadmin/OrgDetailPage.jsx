import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, getDocs, getDoc, doc, query, where, orderBy, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, Users, GitBranch, User, Save, ChevronRight } from 'lucide-react'

const PLAN_CONFIG = {
  trial:    { label: 'Trial',    bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300'   },
  active:   { label: 'Activa',   bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  inactive: { label: 'Inactiva', bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-300'   },
  free:     { label: 'Free',     bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300'    },
}

const STATUS_LABELS = {
  invited:     { label: 'Invitado',     bg: 'bg-slate-100',   text: 'text-slate-600'   },
  in_progress: { label: 'En progreso',  bg: 'bg-blue-100',    text: 'text-blue-700'    },
  completed:   { label: 'Completado',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  review:      { label: 'En revisión',  bg: 'bg-amber-100',   text: 'text-amber-700'   },
  archived:    { label: 'Archivado',    bg: 'bg-slate-100',   text: 'text-slate-400'   },
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Avatar({ name, email, size = 'md' }) {
  const letter = (name || email || '?')[0].toUpperCase()
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full bg-blue-800 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {letter}
    </div>
  )
}

export default function OrgDetailPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const [org, setOrg] = useState(null)
  const [users, setUsers] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [planNote, setPlanNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [orgResult, usersResult, wfResult, exResult] = await Promise.allSettled([
        getDoc(doc(db, 'organizations', orgId)),
        getDocs(query(collection(db, 'users'), where('orgId', '==', orgId))),
        getDocs(query(collection(db, 'workflows'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'executions'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))),
      ])

      if (orgResult.status === 'fulfilled' && orgResult.value.exists()) {
        const data = { id: orgResult.value.id, ...orgResult.value.data() }
        setOrg(data)
        setPlan(data.plan || 'free')
        setPlanNote(data.planNote || '')
      } else if (orgResult.status === 'rejected') {
        console.error('Error cargando organización:', orgResult.reason)
      }
      if (usersResult.status === 'fulfilled')
        setUsers(usersResult.value.docs.map(d => ({ id: d.id, ...d.data() })))
      if (wfResult.status === 'fulfilled')
        setWorkflows(wfResult.value.docs.map(d => ({ id: d.id, ...d.data() })))
      if (exResult.status === 'fulfilled')
        setExecutions(exResult.value.docs.map(d => ({ id: d.id, ...d.data() })))

      setLoading(false)
    }
    load()
  }, [orgId])

  async function handleSavePlan() {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        plan,
        planNote,
        planSince: serverTimestamp(),
      })
      setOrg(prev => ({ ...prev, plan, planNote }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!org) return (
    <div className="p-6 text-center text-slate-400">Organización no encontrada.</div>
  )

  const planConf = PLAN_CONFIG[plan] || PLAN_CONFIG.free
  const admin = users.find(u => u.role === 'admin')
  const supervisors = users.filter(u => u.role === 'supervisor')
  const planChanged = plan !== (org.plan || 'free') || planNote !== (org.planNote || '')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/superadmin')}
          className="mt-0.5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${planConf.bg} ${planConf.text}`}>
              {planConf.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            ID: {orgId} · Creada: {formatDate(org.createdAt)}
          </p>
        </div>
      </div>

      {/* Plan control */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Suscripción</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(PLAN_CONFIG).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => setPlan(key)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                plan === key
                  ? `${conf.bg} ${conf.text} ${conf.border}`
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {conf.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={planNote}
          onChange={e => setPlanNote(e.target.value)}
          placeholder="Nota interna (ej: paga mensual $29, vence 31/12...)"
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSavePlan}
            disabled={saving || (!planChanged && !saving)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              planChanged
                ? 'bg-blue-800 text-white hover:bg-blue-900'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? '¡Guardado!' : saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {org.planSince && (
            <p className="text-xs text-slate-400">Última actualización: {formatDate(org.planSince)}</p>
          )}
        </div>
      </div>

      {/* Admin */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" /> Administrador
        </h2>
        {admin ? (
          <div className="flex items-center gap-3">
            <Avatar name={admin.displayName} email={admin.email} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{admin.displayName || '—'}</p>
              <p className="text-xs text-slate-500">{admin.email}</p>
            </div>
            <p className="text-xs text-slate-400 flex-shrink-0">Desde {formatDate(admin.createdAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sin admin registrado.</p>
        )}
      </div>

      {/* Supervisors */}
      {supervisors.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" /> Supervisores ({supervisors.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {supervisors.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={u.displayName} email={u.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">{u.displayName || u.email}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(u.joinedAt || u.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflows */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-400" /> Flujos ({workflows.length})
          </h2>
        </div>
        {workflows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">Sin flujos creados.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {workflows.map(wf => (
              <div key={wf.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">{wf.name}</p>
                  <p className="text-xs text-slate-400">{wf.nodes?.length || 0} nodos</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0 mr-3">{formatDate(wf.createdAt)}</p>
                <Link
                  to={`/superadmin/org/${orgId}/workflow/${wf.id}`}
                  className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium flex-shrink-0"
                >
                  Ver <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Executions */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Clientes ({executions.length})
          </h2>
        </div>
        {executions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">Sin clientes invitados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Flujo</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500">Estado</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Fecha</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {executions.map(ex => {
                  const s = STATUS_LABELS[ex.archived ? 'archived' : ex.status] || STATUS_LABELS.invited
                  return (
                    <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-slate-800">{ex.clientName}</p>
                        <p className="text-xs text-slate-400">{ex.clientEmail}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{ex.workflowName}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400 whitespace-nowrap">{formatDate(ex.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/superadmin/org/${orgId}/execution/${ex.id}`}
                          className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium whitespace-nowrap"
                        >
                          Ver <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, getDocs, getDoc, doc, query, where, orderBy,
  updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../../lib/firebase'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, Users, GitBranch, User, Save,
  ChevronRight, ShieldOff, ShieldCheck, Mail, StickyNote, X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

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

function formatDateTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

function ConfirmDialog({ title, description, confirmLabel, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmailModal({ admin, onClose }) {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return
    setSending(true)
    setError('')
    try {
      const fn = httpsCallable(getFunctions(), 'emailOrgAdmin')
      await fn({ toEmail: admin.email, toName: admin.displayName, subject: subject.trim(), message: message.trim() })
      setSent(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      setError('Error al enviar: ' + (e.message || 'inténtalo de nuevo'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Email al administrador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-sm text-slate-500">
            Para: <span className="font-medium text-slate-800">{admin.displayName || admin.email}</span>
            {' '}<span className="text-slate-400">&lt;{admin.email}&gt;</span>
          </div>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Asunto"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <textarea
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Escribe tu mensaje…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            {sent ? '¡Enviado!' : sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrgDetailPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [org, setOrg] = useState(null)
  const [users, setUsers] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)

  // Plan
  const [plan, setPlan] = useState('free')
  const [planNote, setPlanNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Block
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [blockSaving, setBlockSaving] = useState(false)

  // Notes
  const [noteText, setNoteText] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false)

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
      await updateDoc(doc(db, 'organizations', orgId), { plan, planNote, planSince: serverTimestamp() })
      setOrg(prev => ({ ...prev, plan, planNote }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleBlock() {
    setBlockSaving(true)
    try {
      const newBlocked = !org.blocked
      const noteEntry = {
        text: newBlocked ? '🔒 Organización suspendida' : '✅ Suspensión levantada',
        by: user?.email || 'superadmin',
        at: new Date().toISOString(),
      }
      await updateDoc(doc(db, 'organizations', orgId), {
        blocked: newBlocked,
        notes: arrayUnion(noteEntry),
      })
      setOrg(prev => ({
        ...prev,
        blocked: newBlocked,
        notes: [...(prev.notes || []), noteEntry],
      }))
    } finally {
      setBlockSaving(false)
      setConfirmBlock(false)
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    const text = noteText.trim()
    if (!text) return
    setNotesSaving(true)
    try {
      const noteEntry = { text, by: user?.email || 'superadmin', at: new Date().toISOString() }
      await updateDoc(doc(db, 'organizations', orgId), { notes: arrayUnion(noteEntry) })
      setOrg(prev => ({ ...prev, notes: [...(prev.notes || []), noteEntry] }))
      setNoteText('')
    } finally {
      setNotesSaving(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!org) return (
    <div className="p-6 text-center text-slate-400">Organización no encontrada.</div>
  )

  const planConf = PLAN_CONFIG[plan] || PLAN_CONFIG.free
  const admin = users.find(u => u.role === 'admin')
  const supervisors = users.filter(u => u.role === 'supervisor')
  const planChanged = plan !== (org.plan || 'free') || planNote !== (org.planNote || '')
  const notes = (org.notes || []).slice().reverse()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Blocked banner */}
      {org.blocked && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm">
          <ShieldOff className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="flex-1 text-red-700 font-medium">Esta organización está suspendida. Los usuarios no pueden acceder al sistema.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/superadmin/orgs')}
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
            {org.blocked && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                Suspendida
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            ID: {orgId} · Creada: {formatDate(org.createdAt)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {admin && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          )}
          <button
            onClick={() => setConfirmBlock(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              org.blocked
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
            }`}
          >
            {org.blocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            {org.blocked ? 'Desbloquear' : 'Suspender'}
          </button>
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
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-200 mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSavePlan}
            disabled={saving || !planChanged}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              planChanged
                ? 'bg-purple-700 text-white hover:bg-purple-800'
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

      {/* Notes history */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-slate-400" /> Notas internas
        </h2>
        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Agregar nota…"
            className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <button
            type="submit"
            disabled={notesSaving || !noteText.trim()}
            className="px-3 py-2 text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors disabled:opacity-60"
          >
            {notesSaving ? '…' : 'Agregar'}
          </button>
        </form>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-400">Sin notas.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {notes.map((n, i) => (
              <div key={i} className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-700">{n.text}</p>
                <p className="text-xs text-slate-400 mt-1">{n.by} · {n.at ? formatDateTime({ toDate: () => new Date(n.at) }) : '—'}</p>
              </div>
            ))}
          </div>
        )}
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

      {/* Confirm block/unblock */}
      {confirmBlock && (
        <ConfirmDialog
          title={org.blocked ? 'Desbloquear organización' : 'Suspender organización'}
          description={
            org.blocked
              ? 'Los usuarios podrán volver a acceder al sistema.'
              : 'Todos los usuarios de esta organización perderán el acceso hasta que la desbloquees.'
          }
          confirmLabel={org.blocked ? 'Sí, desbloquear' : 'Sí, suspender'}
          confirmClass={org.blocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
          onConfirm={handleToggleBlock}
          onCancel={() => setConfirmBlock(false)}
        />
      )}

      {/* Email modal */}
      {showEmailModal && admin && (
        <EmailModal admin={admin} onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  )
}

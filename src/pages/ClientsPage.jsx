import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import KanbanBoard from '../components/kanban/KanbanBoard'
import InviteClientModal from '../components/kanban/InviteClientModal'
import OperatorChatPanel from '../components/chat/OperatorChatPanel'
import { UserPlus, Loader2, Download, Search, X, ChevronDown, Building2, User, Phone, MapPin, Briefcase } from 'lucide-react'

export default function ClientsPage() {
  const { user } = useAuth()
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedExec, setSelectedExec] = useState(null)
  const [filterWorkflowId, setFilterWorkflowId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [clientProfiles, setClientProfiles] = useState({})

  useEffect(() => {
    const orgId = user.profile?.orgId || user.uid
    const q = query(collection(db, 'executions'), where('orgId', '==', orgId))
    const unsub = onSnapshot(
      q,
      snap => {
        setExecutions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      err => {
        console.error('Error al cargar clientes:', err)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  useEffect(() => {
    const orgId = user.profile?.orgId || user.uid
    const q = query(collection(db, 'clients'), where('orgId', '==', orgId))
    return onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => { const data = d.data(); map[data.email] = { id: d.id, ...data } })
      setClientProfiles(map)
    }, () => {})
  }, [])

  const availableWorkflows = useMemo(() => {
    const seen = new Map()
    executions.forEach(e => {
      if (e.workflowId && e.workflowName && !seen.has(e.workflowId)) {
        seen.set(e.workflowId, e.workflowName)
      }
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [executions])

  const filteredExecutions = useMemo(() => {
    return executions.filter(e => {
      const matchWorkflow = !filterWorkflowId || e.workflowId === filterWorkflowId
      const q = searchQuery.toLowerCase()
      const matchSearch = !q ||
        (e.clientName || '').toLowerCase().includes(q) ||
        (e.clientEmail || '').toLowerCase().includes(q)
      return matchWorkflow && matchSearch
    })
  }, [executions, filterWorkflowId, searchQuery])

  function exportCSV() {
    const rows = filteredExecutions.map(e => ({
      Nombre: e.clientName || '',
      Email: e.clientEmail || '',
      Flujo: e.workflowName || '',
      Estado: e.status || '',
      Progreso: `${e.completedNodes || 0}/${e.totalNodes || 0}`,
      Creado: e.createdAt?.toDate?.()?.toISOString?.() || '',
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = filterWorkflowId || searchQuery

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex-shrink-0 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
            <p className="text-slate-500 text-sm mt-1">
              {filteredExecutions.length}{hasFilters ? ` de ${executions.length}` : ''} cliente{filteredExecutions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filteredExecutions.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-3.5 py-2.5 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:block">Exportar CSV</span>
              </button>
            )}
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:block">Invitar cliente</span>
              <span className="sm:hidden">Invitar</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
            />
          </div>
          <div className="relative">
            <select
              value={filterWorkflowId}
              onChange={e => setFilterWorkflowId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white"
            >
              <option value="">Todos los flujos</option>
              {availableWorkflows.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterWorkflowId(''); setSearchQuery('') }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8 py-6">
          <KanbanBoard executions={filteredExecutions} onCardClick={setSelectedExec} clientProfiles={clientProfiles} />
        </div>
      )}

      {showInvite && (
        <InviteClientModal onClose={() => setShowInvite(false)} onCreated={() => setShowInvite(false)} />
      )}

      {selectedExec && selectedExec.humanSupportRequested && selectedExec.status !== 'completed' ? (
        <OperatorChatPanel execution={selectedExec} onClose={() => setSelectedExec(null)} />
      ) : selectedExec ? (
        <ExecutionDetailModal execution={selectedExec} clientProfile={clientProfiles[selectedExec.clientEmail]} onClose={() => setSelectedExec(null)} />
      ) : null}
    </div>
  )
}

// ── ExecutionDetailModal ───────────────────────────────────────────────────────

function ExecutionDetailModal({ execution, clientProfile, onClose }) {
  const [workflow, setWorkflow] = useState(null)

  useEffect(() => {
    if (!execution.workflowId) return
    getDoc(doc(db, 'workflows', execution.workflowId))
      .then(snap => { if (snap.exists()) setWorkflow({ id: snap.id, ...snap.data() }) })
      .catch(() => {})
  }, [execution.workflowId])

  function findNode(nodeId) {
    return (workflow?.nodes || []).find(n => n.id === nodeId) ?? null
  }

  const statusLabel = {
    invited: 'Invitado',
    in_progress: 'En progreso',
    completed: 'Completado',
  }[execution.status] || execution.status

  const statusColor = {
    invited: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[execution.status] || 'bg-slate-50 text-slate-700 border-slate-200'

  const responseEntries = Object.entries(execution.responses || {}).filter(([, data]) => {
    if (!data || typeof data !== 'object') return false
    const keys = Object.keys(data)
    return keys.length > 0 && !keys.every(k => k === 'aiResult')
  })

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 flex-shrink-0">
              {clientProfile?.photoUrl
                ? <img src={clientProfile.photoUrl} alt="" className="w-full h-full object-cover" />
                : (execution.clientName || 'C')[0].toUpperCase()
              }
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{execution.clientName}</h3>
              <p className="text-slate-500 text-sm">{execution.clientEmail}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Client profile */}
          {clientProfile ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {clientProfile.type === 'juridica'
                  ? <><Building2 className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Empresa</span></>
                  : <><User className="w-3.5 h-3.5 text-slate-400" /><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Persona natural</span></>
                }
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                {clientProfile.type === 'juridica' && clientProfile.companyName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Empresa</span>
                    <span className="text-slate-900 font-medium text-right">{clientProfile.companyName}</span>
                  </div>
                )}
                {clientProfile.type === 'juridica' && clientProfile.companyRut && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">RUT empresa</span>
                    <span className="text-slate-900 font-medium">{clientProfile.companyRut}</span>
                  </div>
                )}
                {clientProfile.type === 'juridica' && clientProfile.industry && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Rubro</span>
                    <span className="text-slate-900 font-medium">{clientProfile.industry}</span>
                  </div>
                )}
                {clientProfile.type === 'juridica' && clientProfile.position && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cargo</span>
                    <span className="text-slate-900 font-medium">{clientProfile.position}</span>
                  </div>
                )}
                {clientProfile.rut && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">RUT</span>
                    <span className="text-slate-900 font-medium">{clientProfile.rut}</span>
                  </div>
                )}
                {clientProfile.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</span>
                    <a href={`tel:${clientProfile.phone}`} className="text-blue-800 font-medium hover:underline">{clientProfile.phone}</a>
                  </div>
                )}
                {clientProfile.address && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Ciudad</span>
                    <span className="text-slate-900 font-medium">{clientProfile.address}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-300" />
              <span className="text-xs text-slate-400">El cliente aún no ha completado su perfil.</span>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Flujo', execution.workflowName || '—'],
              ['Progreso', `${execution.completedNodes || 0} / ${execution.totalNodes || 0} pasos`],
              ['Invitado', execution.createdAt?.toDate?.()?.toLocaleDateString?.('es-CL') || '—'],
              ['Actualizado', execution.updatedAt?.toDate?.()?.toLocaleDateString?.('es-CL') || '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
                <p className="text-sm text-slate-900 font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* Responses */}
          {responseEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Respuestas</p>
              <div className="space-y-3">
                {responseEntries.map(([nodeId, data]) => {
                  const node = findNode(nodeId)
                  const nodeName = node?.data?.label || 'Paso'
                  const fields = node?.data?.fields || []
                  const entries = Object.entries(data).filter(([k]) => k !== 'aiResult')
                  if (entries.length === 0) return null
                  return (
                    <div key={nodeId} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-600">{nodeName}</p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {entries.map(([k, v]) => {
                          const field = fields.find(f => f.id === k)
                          return (
                            <div key={k} className="flex justify-between items-start gap-4 px-4 py-2.5">
                              <span className="text-slate-500 text-sm flex-shrink-0">{field?.label || k}</span>
                              <span className="text-slate-900 text-sm font-medium text-right break-words">{String(v)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {responseEntries.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Sin respuestas aún.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

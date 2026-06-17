import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { ArrowLeft } from 'lucide-react'
import { NODE_TYPES_CONFIG } from '../../components/builder/nodes/nodeTypes'

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getOrderedNodes(nodes, edges) {
  const start = nodes.find(n => n.type === 'start')
  if (!start) return nodes
  const ordered = []
  const visited = new Set()
  let current = start
  while (current && !visited.has(current.id)) {
    ordered.push(current)
    visited.add(current.id)
    const yesEdge = edges.find(e => e.source === current.id && e.sourceHandle === 'yes')
    const anyEdge = edges.find(e => e.source === current.id)
    const nextEdge = yesEdge || anyEdge
    current = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null
  }
  return ordered
}

function NodeConfig({ node }) {
  const { type, data } = node
  const d = data || {}

  if (type === 'form') {
    const fields = d.fields || []
    if (!fields.length) return <p className="text-xs text-slate-400">Sin campos configurados.</p>
    return (
      <ul className="space-y-1">
        {fields.map(f => (
          <li key={f.id} className="flex items-start gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-700 min-w-0">{f.label}</span>
            <span className="text-slate-400">{f.type}{f.required ? ' · obligatorio' : ''}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (type === 'ai') {
    return d.aiPrompt
      ? <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{d.aiPrompt}</p>
      : <p className="text-xs text-slate-400">Sin prompt configurado.</p>
  }

  if (type === 'decision') {
    const opts = d.options || []
    if (!opts.length) return <p className="text-xs text-slate-400">Sin opciones configuradas.</p>
    return (
      <ul className="space-y-1">
        {opts.map(o => (
          <li key={o.id} className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            {o.label}
          </li>
        ))}
      </ul>
    )
  }

  if (type === 'condition') {
    if (!d.conditionField) return <p className="text-xs text-slate-400">Sin condición configurada.</p>
    return (
      <p className="text-xs text-slate-600 font-mono">
        {d.conditionField} {d.conditionOp} "{d.conditionValue}"
      </p>
    )
  }

  if (type === 'notification') {
    return (
      <div className="space-y-1">
        {d.subject && <p className="text-xs text-slate-600"><span className="font-medium">Asunto:</span> {d.subject}</p>}
        {d.message && <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{d.message}</p>}
      </div>
    )
  }

  if (type === 'upload') {
    return d.instructions
      ? <p className="text-xs text-slate-600 whitespace-pre-wrap">{d.instructions}</p>
      : <p className="text-xs text-slate-400">Sin instrucciones configuradas.</p>
  }

  return null
}

export default function WorkflowDetailPage() {
  const { orgId, workflowId } = useParams()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'workflows', workflowId))
      .then(snap => {
        if (snap.exists()) setWorkflow({ id: snap.id, ...snap.data() })
      })
      .finally(() => setLoading(false))
  }, [workflowId])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!workflow) return (
    <div className="p-6 text-center text-slate-400">Flujo no encontrado.</div>
  )

  const nodes = workflow.nodes || []
  const edges = workflow.edges || []
  const ordered = getOrderedNodes(nodes, edges)
  const kbFiles = workflow.knowledgeBaseFiles || []
  const kbText = workflow.knowledgeBase || ''

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
        <div>
          <h1 className="text-xl font-bold text-slate-900">{workflow.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Creado: {formatDate(workflow.createdAt)} · {ordered.length} nodos</p>
        </div>
      </div>

      {/* Knowledge base */}
      {(kbText || kbFiles.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Base de conocimiento</h2>
          {kbText && (
            <div className="bg-slate-50 rounded-xl p-3 mb-3">
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-6">{kbText}</p>
            </div>
          )}
          {kbFiles.length > 0 && (
            <div className="space-y-1">
              {kbFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="text-slate-400">📄</span>
                  <span className="font-medium">{f.name}</span>
                  <span className="text-slate-400">{f.extractedText ? `${Math.round(f.extractedText.length / 1000)}k chars extraídos` : 'sin extracción'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nodes */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Nodos del flujo</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {ordered.map((node, i) => {
            const conf = NODE_TYPES_CONFIG[node.type] || {}
            return (
              <div key={node.id} className="px-5 py-4 flex gap-4">
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full ${conf.bgLight || 'bg-slate-100'} border ${conf.border || 'border-slate-200'} flex items-center justify-center text-sm`}>
                    {conf.icon || i + 1}
                  </div>
                  {i < ordered.length - 1 && (
                    <div className="w-px flex-1 bg-slate-100 min-h-[12px]" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conf.bgLight || 'bg-slate-100'} ${conf.textColor || 'text-slate-600'}`}>
                      {conf.label || node.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1.5">
                    {node.data?.label || conf.label}
                  </p>
                  <NodeConfig node={node} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

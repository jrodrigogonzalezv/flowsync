import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2, GitBranch, TrendingDown, Users, ChevronDown } from 'lucide-react'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const orgId = user?.profile?.orgId || user?.uid
  const [workflows, setWorkflows] = useState([])
  const [selectedWfId, setSelectedWfId] = useState('')
  const [selectedWf, setSelectedWf] = useState(null)
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingExecs, setLoadingExecs] = useState(false)

  // Load workflows
  useEffect(() => {
    getDocs(query(collection(db, 'workflows'), where('userId', '==', orgId)))
      .then(snap => {
        const wfs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setWorkflows(wfs)
        if (wfs.length > 0) setSelectedWfId(wfs[0].id)
      })
      .finally(() => setLoading(false))
  }, [orgId])

  // Load workflow + executions when selection changes
  useEffect(() => {
    if (!selectedWfId) return
    setLoadingExecs(true)
    Promise.all([
      getDoc(doc(db, 'workflows', selectedWfId)),
      getDocs(query(collection(db, 'executions'), where('workflowId', '==', selectedWfId))),
    ]).then(([wfSnap, execsSnap]) => {
      if (wfSnap.exists()) setSelectedWf({ id: wfSnap.id, ...wfSnap.data() })
      setExecutions(execsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).finally(() => setLoadingExecs(false))
  }, [selectedWfId])

  // Funnel: ordered nodes + reach count
  const funnel = useMemo(() => {
    if (!selectedWf || !executions.length) return []
    const nodes = selectedWf.nodes || []
    const edges = selectedWf.edges || []
    const ordered = []
    let current = nodes.find(n => n.type === 'start')
    const visited = new Set()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      if (current.type !== 'start' && current.type !== 'end') ordered.push(current)
      const next = edges.find(e => e.source === current.id && (e.sourceHandle === 'yes' || !e.sourceHandle))
        ?? edges.find(e => e.source === current.id)
      current = next ? nodes.find(n => n.id === next.target) : null
    }
    const total = executions.length
    return ordered.map(node => {
      const reached = executions.filter(e =>
        (e.navigationHistory || []).some(h => h.nodeId === node.id) ||
        e.currentNodeId === node.id ||
        Object.keys(e.responses || {}).includes(node.id)
      ).length
      return {
        id: node.id,
        label: (node.data?.label || node.type).substring(0, 28),
        type: node.type,
        reached,
        pct: total > 0 ? Math.round((reached / total) * 100) : 0,
      }
    })
  }, [selectedWf, executions])

  // Response distribution: all form fields
  const formFields = useMemo(() => {
    if (!selectedWf) return []
    return (selectedWf.nodes || [])
      .filter(n => n.type === 'form' && (n.data?.fields || []).length > 0)
      .flatMap(n => (n.data.fields || []).map(f => ({
        nodeId: n.id,
        nodeName: n.data?.label || 'Formulario',
        fieldId: f.id,
        fieldLabel: f.label,
        type: f.type,
      })))
  }, [selectedWf])

  const [selectedField, setSelectedField] = useState(null)
  useEffect(() => {
    setSelectedField(formFields[0] || null)
  }, [formFields.length, selectedWfId])

  const fieldDistribution = useMemo(() => {
    if (!selectedField) return []
    const counts = {}
    for (const e of executions) {
      const val = e.responses?.[selectedField.nodeId]?.[selectedField.fieldId]
      if (val === undefined || val === null || val === '') continue
      const key = String(val).substring(0, 60)
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([value, count]) => ({ value, count }))
  }, [selectedField, executions])

  // Summary stats
  const completed = executions.filter(e => e.status === 'completed').length
  const convRate = executions.length > 0 ? Math.round((completed / executions.length) * 100) : 0
  const avgDays = (() => {
    const times = executions
      .filter(e => e.status === 'completed' && e.createdAt?.seconds && e.updatedAt?.seconds)
      .map(e => (e.updatedAt.seconds - e.createdAt.seconds) / 86400)
    return times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : null
  })()

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  if (workflows.length === 0) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center p-8">
      <GitBranch className="w-12 h-12 text-slate-200" />
      <p className="text-slate-500 font-medium">Crea flujos primero para ver estadísticas</p>
    </div>
  )

  const NODE_COLORS = {
    form: '#3b82f6',
    ai: '#8b5cf6',
    condition: '#f59e0b',
    notification: '#f97316',
    decision: '#6366f1',
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Análisis detallado de tus flujos.</p>
        </div>
        <div className="relative">
          <select
            value={selectedWfId}
            onChange={e => setSelectedWfId(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white shadow-sm min-w-[200px]"
          >
            {workflows.map(w => <option key={w.id} value={w.id}>{w.name || 'Sin nombre'}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {loadingExecs ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-800 animate-spin" /></div>
      ) : executions.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Este flujo no tiene clientes todavía.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total clientes', value: executions.length, color: 'text-blue-800' },
              { label: 'Completados', value: completed, color: 'text-emerald-700' },
              { label: 'Tasa de conversión', value: `${convRate}%`, color: convRate >= 50 ? 'text-emerald-700' : 'text-amber-700' },
              { label: 'Días promedio', value: avgDays ? `${avgDays}d` : '—', color: 'text-slate-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Funnel */}
          {funnel.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingDown className="w-4 h-4 text-blue-800" />
                <h3 className="font-semibold text-slate-900">Embudo de conversión por nodo</h3>
                <span className="ml-auto text-xs text-slate-400">{executions.length} clientes total</span>
              </div>
              <div className="space-y-3">
                {funnel.map((node, i) => (
                  <div key={node.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{node.label}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded capitalize">{node.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{node.reached} clientes</span>
                        <span className="text-sm font-bold text-slate-900 w-10 text-right">{node.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${node.pct}%`,
                          backgroundColor: NODE_COLORS[node.type] || '#64748b',
                        }}
                      />
                    </div>
                    {i > 0 && funnel[i - 1].reached > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-7">
                        {Math.round((1 - node.reached / funnel[i - 1].reached) * 100)}% abandono desde el paso anterior
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response distribution */}
          {formFields.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h3 className="font-semibold text-slate-900">Distribución de respuestas</h3>
                <select
                  value={selectedField ? `${selectedField.nodeId}::${selectedField.fieldId}` : ''}
                  onChange={e => {
                    const [nodeId, fieldId] = e.target.value.split('::')
                    setSelectedField(formFields.find(f => f.nodeId === nodeId && f.fieldId === fieldId) || null)
                  }}
                  className="appearance-none border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white"
                >
                  {formFields.map(f => (
                    <option key={`${f.nodeId}::${f.fieldId}`} value={`${f.nodeId}::${f.fieldId}`}>
                      {f.nodeName} → {f.fieldLabel}
                    </option>
                  ))}
                </select>
              </div>
              {fieldDistribution.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Sin respuestas para este campo todavía.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, fieldDistribution.length * 42)}>
                  <BarChart data={fieldDistribution} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="value"
                      width={140}
                      tick={{ fontSize: 12, fill: '#475569' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} respuesta${v !== 1 ? 's' : ''}`, '']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {fieldDistribution.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#1e3a8a' : i === 1 ? '#3b82f6' : '#93c5fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-slate-400 mt-3 text-right">
                {executions.filter(e => e.responses?.[selectedField?.nodeId]?.[selectedField?.fieldId]).length} respuestas de {executions.length}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

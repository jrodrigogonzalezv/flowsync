import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { GitBranch, Users, CheckCircle, Clock, Plus, UserPlus, ArrowRight, Loader2, TrendingUp, Mail, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from '../components/utils/date'

const STATUS_LABEL = {
  invited:     { label: 'Invitado',    color: 'text-slate-500',   dot: 'bg-slate-400' },
  in_progress: { label: 'En progreso', color: 'text-blue-700',    dot: 'bg-blue-500' },
  review:      { label: 'En revisión', color: 'text-amber-600',   dot: 'bg-amber-500' },
  completed:   { label: 'Completado',  color: 'text-emerald-600', dot: 'bg-emerald-500' },
}

export default function Dashboard() {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let wfDone = false, execDone = false
    const check = () => { if (wfDone && execDone) setLoading(false) }
    const unsubWf = onSnapshot(
      query(collection(db, 'workflows'), where('userId', '==', user.uid)),
      snap => { setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() }))); wfDone = true; check() }
    )
    const unsubExec = onSnapshot(
      query(collection(db, 'executions'), where('userId', '==', user.uid)),
      snap => { setExecutions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); execDone = true; check() }
    )
    return () => { unsubWf(); unsubExec() }
  }, [])

  const completed = executions.filter(e => e.status === 'completed')
  const inProgress = executions.filter(e => e.status === 'in_progress')
  const invited = executions.filter(e => e.status === 'invited')
  const completionRate = executions.length > 0 ? Math.round((completed.length / executions.length) * 100) : 0

  // Avg time to complete (days), only for executions with createdAt and completedAt or updatedAt when completed
  const avgDays = (() => {
    const times = completed
      .filter(e => e.createdAt?.seconds && e.updatedAt?.seconds)
      .map(e => (e.updatedAt.seconds - e.createdAt.seconds) / 86400)
    if (!times.length) return null
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
  })()

  const stats = [
    { label: 'Flujos',        value: workflows.length,      sub: `${workflows.length === 1 ? '1 activo' : `${workflows.length} activos`}`, icon: GitBranch,   color: 'text-blue-800',    bg: 'bg-blue-50',    border: 'border-blue-100',   to: '/workflows' },
    { label: 'Clientes',      value: executions.length,     sub: `${invited.length} invitados`,           icon: Users,       color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-100',    to: '/clients' },
    { label: 'En progreso',   value: inProgress.length,     sub: `${invited.length} pendientes`,          icon: Clock,       color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-100',  to: '/clients' },
    { label: 'Completados',   value: completed.length,      sub: `${completionRate}% tasa de éxito`,      icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', to: '/clients' },
  ]

  const recent = [...executions]
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))
    .slice(0, 8)

  // Workflow-level stats: count executions per workflow
  const wfStats = workflows.map(w => {
    const execs = executions.filter(e => e.workflowId === w.id)
    return { ...w, total: execs.length, done: execs.filter(e => e.status === 'completed').length }
  }).sort((a, b) => b.total - a.total).slice(0, 5)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Hola, {user?.displayName?.split(' ')[0] || 'bienvenido'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Resumen de tus flujos y clientes.</p>
        </div>
        <Link to="/clients" className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0">
          <UserPlus className="w-4 h-4" /> Invitar cliente
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, border, to }) => (
          <Link key={label} to={to} className={`${bg} border ${border} rounded-2xl p-5 hover:shadow-sm transition-all group`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-sm font-medium">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
            <p className="text-xs text-slate-400">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Analytics bar */}
      {executions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-800" />
            <h3 className="font-semibold text-slate-900 text-sm">Estadísticas generales</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat label="Tasa de completado" value={`${completionRate}%`} color="text-emerald-700" />
            <Stat label="Total de clientes" value={executions.length} color="text-blue-800" />
            <Stat label="Aún activos" value={inProgress.length + invited.length} color="text-amber-700" />
            <Stat label={avgDays ? 'Días promedio' : 'Tiempo prom.'} value={avgDays ? `${avgDays}d` : '—'} color="text-slate-700" />
          </div>
          {executions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Progreso global de clientes</span>
                <span>{completionRate}% completados</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                {completionRate > 0 && <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${completionRate}%` }} />}
                {inProgress.length > 0 && <div className="h-full bg-blue-400 transition-all" style={{ width: `${Math.round((inProgress.length / executions.length) * 100)}%` }} />}
                {invited.length > 0 && <div className="h-full bg-slate-300 transition-all" style={{ width: `${Math.round((invited.length / executions.length) * 100)}%` }} />}
              </div>
              <div className="flex items-center gap-4 mt-2">
                {[['bg-emerald-500', 'Completados'], ['bg-blue-400', 'En progreso'], ['bg-slate-300', 'Invitados']].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${c}`} />
                    <span className="text-xs text-slate-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Actividad reciente</h3>
            <Link to="/clients" className="text-xs text-blue-800 hover:text-blue-900 flex items-center gap-1 font-medium">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Sin actividad todavía</p>
              <p className="text-slate-300 text-xs mt-1">Invita tu primer cliente para empezar.</p>
              <Link to="/clients" className="inline-flex items-center gap-2 mt-4 bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Invitar cliente
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map(exec => {
                const status = STATUS_LABEL[exec.status] || STATUS_LABEL.invited
                const progress = exec.totalNodes > 0 ? Math.round((exec.completedNodes / exec.totalNodes) * 100) : 0
                return (
                  <div key={exec.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-blue-800">
                      {exec.clientName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{exec.clientName}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                          <div className="h-full bg-blue-800 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">{progress}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-600 truncate max-w-[100px]">{exec.workflowName}</p>
                      {exec.updatedAt && <p className="text-[11px] text-slate-400 mt-0.5">{formatDistanceToNow(exec.updatedAt)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Acciones rápidas</h3>
            <div className="space-y-2">
              <Link to="/workflows/new" className="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-sm text-slate-700 hover:text-blue-800 transition-colors font-medium">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-blue-800" />
                </div>
                Crear nuevo flujo
              </Link>
              <Link to="/clients" className="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl text-sm text-slate-700 hover:text-emerald-700 transition-colors font-medium">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                </div>
                Invitar cliente
              </Link>
              <Link to="/workflows" className="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl text-sm text-slate-700 hover:text-violet-700 transition-colors font-medium">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-4 h-4 text-violet-700" />
                </div>
                Ver mis flujos
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {(inProgress.length > 0 || invited.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Atención requerida</h3>
              </div>
              {invited.length > 0 && (
                <p className="text-amber-700 text-xs mb-2 leading-relaxed">
                  <strong>{invited.length}</strong> cliente{invited.length !== 1 ? 's' : ''} {invited.length !== 1 ? 'han sido invitados' : 'ha sido invitado'} pero aún no {invited.length !== 1 ? 'han comenzado' : 'ha comenzado'}.
                </p>
              )}
              {inProgress.length > 0 && (
                <p className="text-amber-700 text-xs leading-relaxed">
                  <strong>{inProgress.length}</strong> cliente{inProgress.length !== 1 ? 's' : ''} {inProgress.length !== 1 ? 'están' : 'está'} completando un flujo ahora.
                </p>
              )}
            </div>
          )}

          {/* Workflows with usage */}
          {wfStats.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Flujos activos</h3>
                <Link to="/workflows" className="text-xs text-blue-800 hover:text-blue-900 font-medium">Ver todos</Link>
              </div>
              <div className="space-y-3">
                {wfStats.map(w => (
                  <Link key={w.id} to={`/workflows/${w.id}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                    <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <GitBranch className="w-3.5 h-3.5 text-blue-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate font-medium">{w.name || 'Sin nombre'}</p>
                      <p className="text-xs text-slate-400">{w.total} cliente{w.total !== 1 ? 's' : ''} · {w.done} completado{w.done !== 1 ? 's' : ''}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {workflows.length === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
              <GitBranch className="w-8 h-8 text-blue-300 mx-auto mb-3" />
              <p className="text-slate-700 font-medium text-sm mb-1">Crea tu primer flujo</p>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">Define los pasos que tus clientes deberán completar.</p>
              <Link to="/workflows/new" className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> Crear flujo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${color} mb-0.5`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

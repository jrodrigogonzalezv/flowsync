import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import {
  GitBranch, Users, CheckCircle, Clock, Plus, UserPlus, ArrowRight,
  Loader2, TrendingUp, AlertCircle, BarChart2,
} from 'lucide-react'
import { formatDistanceToNow } from '../components/utils/date'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'

const STATUS_LABEL = {
  invited:     { label: 'Invitado',    color: 'text-slate-500',   dot: 'bg-slate-400' },
  in_progress: { label: 'En progreso', color: 'text-blue-700',    dot: 'bg-blue-500' },
  review:      { label: 'En revisión', color: 'text-amber-600',   dot: 'bg-amber-500' },
  completed:   { label: 'Completado',  color: 'text-emerald-600', dot: 'bg-emerald-500' },
}

function computeWeeklyData(executions) {
  const now = new Date()
  return Array.from({ length: 8 }, (_, i) => {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - (7 - i) * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 7)
    const label = weekEnd.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })
    const completados = executions.filter(e => {
      if (e.status !== 'completed' || !e.updatedAt?.seconds) return false
      const d = new Date(e.updatedAt.seconds * 1000)
      return d >= weekStart && d < weekEnd
    }).length
    const invitaciones = executions.filter(e => {
      if (!e.createdAt?.seconds) return false
      const d = new Date(e.createdAt.seconds * 1000)
      return d >= weekStart && d < weekEnd
    }).length
    return { semana: label, completados, invitaciones }
  })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orgId = user.profile?.orgId || user.uid
    let wfDone = false, execDone = false
    const check = () => { if (wfDone && execDone) setLoading(false) }
    const unsubWf = onSnapshot(
      query(collection(db, 'workflows'), where('userId', '==', orgId)),
      snap => { setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() }))); wfDone = true; check() },
      err => { console.error('Error workflows:', err); wfDone = true; check() }
    )
    const unsubExec = onSnapshot(
      query(collection(db, 'executions'), where('orgId', '==', orgId)),
      snap => { setExecutions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); execDone = true; check() },
      err => { console.error('Error executions:', err); execDone = true; check() }
    )
    return () => { unsubWf(); unsubExec() }
  }, [])

  const completed = executions.filter(e => e.status === 'completed')
  const inProgress = executions.filter(e => e.status === 'in_progress')
  const invited = executions.filter(e => e.status === 'invited')
  const completionRate = executions.length > 0 ? Math.round((completed.length / executions.length) * 100) : 0

  const avgDays = (() => {
    const times = completed
      .filter(e => e.createdAt?.seconds && e.updatedAt?.seconds)
      .map(e => (e.updatedAt.seconds - e.createdAt.seconds) / 86400)
    if (!times.length) return null
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
  })()

  const weeklyData = useMemo(() => computeWeeklyData(executions), [executions])

  const hasChartData = weeklyData.some(w => w.completados > 0 || w.invitaciones > 0)

  const stats = [
    { label: 'Flujos',      value: workflows.length, sub: `${workflows.length === 1 ? '1 activo' : `${workflows.length} activos`}`,  icon: GitBranch,   color: 'text-blue-800',    bg: 'bg-blue-50',    border: 'border-blue-100',   to: '/workflows' },
    { label: 'Clientes',    value: executions.length, sub: `${invited.length} pendientes`,              icon: Users,       color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-100',    to: '/clients' },
    { label: 'En progreso', value: inProgress.length, sub: `${invited.length} invitados`,               icon: Clock,       color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-100',  to: '/clients' },
    { label: 'Completados', value: completed.length,  sub: `${completionRate}% tasa de éxito`,          icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', to: '/clients' },
  ]

  const recent = [...executions]
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))
    .slice(0, 8)

  const wfStats = workflows
    .map(w => {
      const execs = executions.filter(e => e.workflowId === w.id)
      return { ...w, total: execs.length, done: execs.filter(e => e.status === 'completed').length }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Tendencia semanal */}
      {hasChartData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-blue-800" />
            <h3 className="font-semibold text-slate-900 text-sm">Actividad semanal (últimas 8 semanas)</h3>
            <Link to="/analytics" className="ml-auto text-xs text-blue-800 hover:text-blue-900 font-medium flex items-center gap-1">
              Ver analytics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weeklyData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}
                formatter={(v, name) => [v, name === 'completados' ? 'Completados' : 'Invitaciones']}
              />
              <Line type="monotone" dataKey="invitaciones" stroke="#93c5fd" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completados" stroke="#1e3a8a" strokeWidth={2.5} dot={{ fill: '#1e3a8a', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            {[['#1e3a8a', 'Completados'], ['#93c5fd', 'Invitaciones']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                <span className="text-xs text-slate-500">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {executions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-800" />
            <h3 className="font-semibold text-slate-900 text-sm">Estadísticas generales</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-4">
            <Stat label="Tasa de completado" value={`${completionRate}%`} color="text-emerald-700" />
            <Stat label="Total de clientes" value={executions.length} color="text-blue-800" />
            <Stat label="Aún activos" value={inProgress.length + invited.length} color="text-amber-700" />
            <Stat label={avgDays ? 'Días promedio' : 'Tiempo prom.'} value={avgDays ? `${avgDays}d` : '—'} color="text-slate-700" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Progreso global</span>
              <span>{completionRate}% completados</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
              {completionRate > 0 && <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }} />}
              {inProgress.length > 0 && <div className="h-full bg-blue-400" style={{ width: `${Math.round((inProgress.length / executions.length) * 100)}%` }} />}
              {invited.length > 0 && <div className="h-full bg-slate-300" style={{ width: `${Math.round((invited.length / executions.length) * 100)}%` }} />}
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
                          <div className="h-full bg-blue-800 rounded-full" style={{ width: `${progress}%` }} />
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
              {[
                { to: '/workflows/new', bg: 'bg-blue-100', icon: Plus, iconColor: 'text-blue-800', hover: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800', label: 'Crear nuevo flujo' },
                { to: '/clients', bg: 'bg-emerald-100', icon: UserPlus, iconColor: 'text-emerald-700', hover: 'hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700', label: 'Invitar cliente' },
                { to: '/analytics', bg: 'bg-violet-100', icon: BarChart2, iconColor: 'text-violet-700', hover: 'hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700', label: 'Ver analytics' },
              ].map(({ to, bg, icon: Icon, iconColor, hover, label }) => (
                <Link key={to} to={to} className={`flex items-center gap-3 w-full px-4 py-3 bg-slate-50 ${hover} border border-slate-200 rounded-xl text-sm text-slate-700 transition-colors font-medium`}>
                  <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {(inProgress.length > 0 || invited.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Atención requerida</h3>
              </div>
              {invited.length > 0 && <p className="text-amber-700 text-xs mb-2 leading-relaxed"><strong>{invited.length}</strong> cliente{invited.length !== 1 ? 's' : ''} aún no ha{invited.length !== 1 ? 'n' : ''} comenzado.</p>}
              {inProgress.length > 0 && <p className="text-amber-700 text-xs leading-relaxed"><strong>{inProgress.length}</strong> cliente{inProgress.length !== 1 ? 's' : ''} activo{inProgress.length !== 1 ? 's' : ''} ahora.</p>}
            </div>
          )}

          {wfStats.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Flujos activos</h3>
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

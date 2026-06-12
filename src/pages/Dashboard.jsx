import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { GitBranch, Users, CheckCircle, Clock, Plus, UserPlus, ArrowRight, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from '../components/utils/date'

const STATUS_LABEL = {
  invited:     { label: 'Invitado',     color: 'text-gray-400',    dot: 'bg-gray-400' },
  in_progress: { label: 'En progreso',  color: 'text-blue-400',    dot: 'bg-blue-400' },
  review:      { label: 'En revisión',  color: 'text-yellow-400',  dot: 'bg-yellow-400' },
  completed:   { label: 'Completado',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
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

  const stats = [
    {
      label: 'Flujos',
      value: workflows.length,
      icon: GitBranch,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      to: '/workflows',
    },
    {
      label: 'Clientes',
      value: executions.length,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      to: '/clients',
    },
    {
      label: 'En progreso',
      value: executions.filter(e => e.status === 'in_progress' || e.status === 'invited').length,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      to: '/clients',
    },
    {
      label: 'Completados',
      value: executions.filter(e => e.status === 'completed').length,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      to: '/clients',
    },
  ]

  const recent = [...executions]
    .sort((a, b) => {
      const ta = a.updatedAt?.seconds ?? 0
      const tb = b.updatedAt?.seconds ?? 0
      return tb - ta
    })
    .slice(0, 6)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Hola, {user?.displayName?.split(' ')[0] || 'bienvenido'}
        </h2>
        <p className="text-gray-400 text-sm mt-1">Aquí tienes un resumen de tus flujos y clientes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, border, to }) => (
          <Link
            key={label}
            to={to}
            className={`${bg} border ${border} rounded-2xl p-5 hover:brightness-110 transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Actividad reciente</h3>
            <Link to="/clients" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Sin actividad todavía.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {recent.map(exec => {
                const status = STATUS_LABEL[exec.status] || STATUS_LABEL.invited
                const progress = exec.totalNodes > 0
                  ? Math.round((exec.completedNodes / exec.totalNodes) * 100)
                  : 0
                return (
                  <div key={exec.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-300">
                      {exec.clientName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{exec.clientName}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          <span className={`text-xs ${status.color}`}>{status.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{progress}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 truncate max-w-[100px]">{exec.workflowName}</p>
                      {exec.updatedAt && (
                        <p className="text-[11px] text-gray-600 mt-0.5">{formatDistanceToNow(exec.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4">Acciones rápidas</h3>
            <div className="space-y-2">
              <Link
                to="/workflows/new"
                className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-white transition-colors"
              >
                <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-indigo-400" />
                </div>
                Crear nuevo flujo
              </Link>
              <Link
                to="/clients"
                className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-white transition-colors"
              >
                <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                </div>
                Invitar cliente
              </Link>
            </div>
          </div>

          {/* Flujos recientes */}
          {workflows.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Mis flujos</h3>
                <Link to="/workflows" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-2">
                {workflows.slice(0, 4).map(w => (
                  <Link
                    key={w.id}
                    to={`/workflows/${w.id}`}
                    className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity"
                  >
                    <GitBranch className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{w.name || 'Sin nombre'}</span>
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

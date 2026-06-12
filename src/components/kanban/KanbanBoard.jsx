import KanbanCard from './KanbanCard'
import { Users } from 'lucide-react'

const COLUMNS = [
  { id: 'invited',     label: 'Invitado',     color: 'text-slate-600',   dot: 'bg-slate-400',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  { id: 'in_progress', label: 'En progreso',  color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'review',      label: 'En revisión',  color: 'text-amber-700',   dot: 'bg-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { id: 'completed',   label: 'Completado',   color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
]

export default function KanbanBoard({ executions, onCardClick }) {
  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = executions.filter(e => e.status === col.id)
    return acc
  }, {})

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map(col => (
        <div key={col.id} className="flex flex-col w-72 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className={`w-2 h-2 rounded-full ${col.dot}`} />
            <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
            <span className="ml-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
              {byStatus[col.id].length}
            </span>
          </div>

          <div className={`flex-1 ${col.bg} border ${col.border} rounded-2xl p-3 space-y-3 min-h-[200px]`}>
            {byStatus[col.id].length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                <Users className="w-6 h-6 mb-2" />
                <span className="text-xs font-medium">Sin clientes</span>
              </div>
            ) : (
              byStatus[col.id].map(exec => (
                <KanbanCard key={exec.id} execution={exec} onClick={() => onCardClick(exec)} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

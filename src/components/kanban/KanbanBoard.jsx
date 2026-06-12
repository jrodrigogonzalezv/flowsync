import KanbanCard from './KanbanCard'
import { Users } from 'lucide-react'

const COLUMNS = [
  { id: 'invited',     label: 'Invitado',      color: 'text-gray-400',    dot: 'bg-gray-400' },
  { id: 'in_progress', label: 'En progreso',   color: 'text-blue-400',    dot: 'bg-blue-400' },
  { id: 'review',      label: 'En revisión',   color: 'text-yellow-400',  dot: 'bg-yellow-400' },
  { id: 'completed',   label: 'Completado',    color: 'text-emerald-400', dot: 'bg-emerald-400' },
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
            <span className={`text-sm font-medium ${col.color}`}>{col.label}</span>
            <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
              {byStatus[col.id].length}
            </span>
          </div>

          <div className="flex-1 bg-gray-800/50 rounded-2xl p-3 space-y-3 min-h-[200px] border border-gray-800">
            {byStatus[col.id].length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <Users className="w-6 h-6 mb-2" />
                <span className="text-xs">Sin clientes</span>
              </div>
            ) : (
              byStatus[col.id].map(exec => (
                <KanbanCard
                  key={exec.id}
                  execution={exec}
                  onClick={() => onCardClick(exec)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

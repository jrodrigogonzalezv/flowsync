import { formatDistanceToNow } from '../utils/date'
import { GitBranch, Clock, CheckCircle, AlertCircle, Mail } from 'lucide-react'

const statusIcon = {
  invited:     <Mail className="w-3.5 h-3.5 text-slate-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  review:      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  completed:   <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
}

export default function KanbanCard({ execution, onClick }) {
  const progress = execution.totalNodes > 0
    ? Math.round((execution.completedNodes / execution.totalNodes) * 100)
    : 0

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all hover:border-slate-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{execution.clientName || 'Cliente'}</p>
          <p className="text-xs text-slate-400 truncate max-w-[140px] mt-0.5">{execution.clientEmail}</p>
        </div>
        {statusIcon[execution.status]}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <GitBranch className="w-3 h-3 text-slate-400 flex-shrink-0" />
        <span className="text-xs text-slate-500 truncate">{execution.workflowName}</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Paso {execution.completedNodes || 0}/{execution.totalNodes || 0}</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-800 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {execution.updatedAt && (
        <p className="text-[11px] text-slate-400 mt-2">{formatDistanceToNow(execution.updatedAt)}</p>
      )}
    </div>
  )
}

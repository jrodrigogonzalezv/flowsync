import { formatDistanceToNow } from '../utils/date'
import { GitBranch, Clock, CheckCircle, AlertCircle, Mail } from 'lucide-react'

const statusIcon = {
  invited:     <Mail className="w-3 h-3 text-gray-400" />,
  in_progress: <Clock className="w-3 h-3 text-blue-400" />,
  review:      <AlertCircle className="w-3 h-3 text-yellow-400" />,
  completed:   <CheckCircle className="w-3 h-3 text-emerald-400" />,
}

export default function KanbanCard({ execution, onClick }) {
  const progress = execution.totalNodes > 0
    ? Math.round((execution.completedNodes / execution.totalNodes) * 100)
    : 0

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-gray-500 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-white">{execution.clientName || 'Cliente'}</p>
          <p className="text-xs text-gray-500 truncate max-w-[140px]">{execution.clientEmail}</p>
        </div>
        {statusIcon[execution.status]}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <GitBranch className="w-3 h-3 text-gray-500 flex-shrink-0" />
        <span className="text-xs text-gray-400 truncate">{execution.workflowName}</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Paso {execution.completedNodes || 0}/{execution.totalNodes || 0}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {execution.updatedAt && (
        <p className="text-[11px] text-gray-600">
          {formatDistanceToNow(execution.updatedAt)}
        </p>
      )}
    </div>
  )
}

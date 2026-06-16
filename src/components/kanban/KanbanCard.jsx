import { formatDistanceToNow } from '../utils/date'
import { GitBranch, Clock, CheckCircle, AlertCircle, Mail, MessageCircle, Building2 } from 'lucide-react'

const statusIcon = {
  invited:     <Mail className="w-3.5 h-3.5 text-slate-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  review:      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  completed:   <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
}

export default function KanbanCard({ execution, onClick, clientProfile }) {
  const progress = execution.totalNodes > 0
    ? Math.round((execution.completedNodes / execution.totalNodes) * 100)
    : 0

  const needsSupport = !!execution.humanSupportRequested && execution.status !== 'completed'

  return (
    <div
      onClick={onClick}
      className={`relative bg-white border rounded-xl p-4 cursor-pointer transition-all
        ${needsSupport
          ? 'border-red-400 ring-2 ring-red-400/30 hover:shadow-lg hover:shadow-red-100'
          : 'border-slate-200 hover:shadow-md hover:border-slate-300'
        }`}
    >
      {needsSupport && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
          <MessageCircle className="w-2.5 h-2.5" />
          AYUDA
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
            {clientProfile?.photoUrl
              ? <img src={clientProfile.photoUrl} alt="" className="w-full h-full object-cover" />
              : (execution.clientName || 'C')[0].toUpperCase()
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {clientProfile?.type === 'juridica' ? clientProfile.companyName || execution.clientName : execution.clientName || 'Cliente'}
            </p>
            <p className="text-xs text-slate-400 truncate">{execution.clientEmail}</p>
          </div>
        </div>
        {needsSupport
          ? <MessageCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          : statusIcon[execution.status]
        }
      </div>

      {clientProfile?.type === 'juridica' && clientProfile.companyName && (
        <div className="flex items-center gap-1 mb-2">
          <Building2 className="w-3 h-3 text-indigo-400 flex-shrink-0" />
          <span className="text-xs text-indigo-600 font-medium truncate">{clientProfile.name}</span>
          {clientProfile.position && <span className="text-xs text-slate-400">· {clientProfile.position}</span>}
        </div>
      )}

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
            className={`h-full rounded-full transition-all ${needsSupport ? 'bg-red-400' : 'bg-blue-800'}`}
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

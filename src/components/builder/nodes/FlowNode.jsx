import { Handle, Position } from '@xyflow/react'
import { NODE_TYPES_CONFIG } from './nodeTypes'

export default function FlowNode({ data, selected, type }) {
  const config = NODE_TYPES_CONFIG[type] || NODE_TYPES_CONFIG.form

  return (
    <div className={`min-w-[180px] rounded-xl border-2 ${config.border} bg-white shadow-md ${
      selected ? `ring-2 ring-offset-2 ring-blue-800/30` : 'hover:shadow-lg'
    } cursor-pointer transition-all`}>
      {config.maxInputs > 0 && (
        <Handle type="target" position={Position.Top}
          className="!w-3 !h-3 !bg-white !border-2 !border-slate-300 hover:!border-blue-800" />
      )}

      <div className={`px-4 py-2.5 flex items-center gap-2 ${config.bgLight} rounded-t-xl border-b ${config.border}`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${config.textColor}`}>{config.label}</span>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-800 leading-tight">
          {data.label || config.label}
        </p>
        {data.description && (
          <p className="text-xs text-slate-500 mt-1 leading-tight line-clamp-2">{data.description}</p>
        )}
        {data.fields?.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">{data.fields.length} campo{data.fields.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {config.maxOutputs === 2 ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '30%' }}
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
          <Handle type="source" position={Position.Bottom} id="no" style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white" />
          <div className="flex justify-between px-4 pb-2.5 pt-1">
            <span className="text-[10px] font-semibold text-emerald-600">Sí</span>
            <span className="text-[10px] font-semibold text-rose-600">No</span>
          </div>
        </>
      ) : config.maxOutputs === 1 ? (
        <Handle type="source" position={Position.Bottom}
          className="!w-3 !h-3 !bg-white !border-2 !border-slate-300 hover:!border-blue-800" />
      ) : null}
    </div>
  )
}

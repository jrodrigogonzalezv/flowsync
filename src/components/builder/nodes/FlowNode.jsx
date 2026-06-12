import { Handle, Position } from '@xyflow/react'
import { NODE_TYPES_CONFIG } from './nodeTypes'

export default function FlowNode({ data, selected, type }) {
  const config = NODE_TYPES_CONFIG[type] || NODE_TYPES_CONFIG.form

  return (
    <div
      className={`min-w-[160px] rounded-xl border-2 ${config.border} ${
        selected ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-transparent' : ''
      } bg-gray-900 shadow-xl cursor-pointer transition-all`}
    >
      {config.maxInputs > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
        />
      )}

      <div className={`px-4 py-3 flex items-center gap-2 ${config.bgLight} rounded-t-xl`}>
        <span className="text-base">{config.icon}</span>
        <span className={`text-xs font-semibold uppercase tracking-wider ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm font-medium text-white leading-tight">
          {data.label || config.label}
        </p>
        {data.description && (
          <p className="text-xs text-gray-400 mt-1 leading-tight">{data.description}</p>
        )}
      </div>

      {config.maxOutputs === 2 ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: '30%' }}
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-gray-900"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-gray-900"
          />
          <div className="flex justify-between px-4 pb-2">
            <span className="text-[10px] text-emerald-400">Sí</span>
            <span className="text-[10px] text-red-400">No</span>
          </div>
        </>
      ) : config.maxOutputs === 1 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
        />
      ) : null}
    </div>
  )
}

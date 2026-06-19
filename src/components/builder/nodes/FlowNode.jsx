import { Handle, Position } from '@xyflow/react'
import { NODE_TYPES_CONFIG } from './nodeTypes'

export default function FlowNode({ data, selected, type }) {
  const config = NODE_TYPES_CONFIG[type] || NODE_TYPES_CONFIG.form

  return (
    <div className={`min-w-[210px] rounded-xl border-2 ${config.border} bg-white shadow-md ${
      selected ? 'ring-2 ring-offset-2 ring-blue-800/30' : 'hover:shadow-lg'
    } cursor-pointer transition-all flex`}>

      {config.maxInputs > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-white !border-2 !border-slate-300 hover:!border-blue-800"
        />
      )}

      {/* Left accent bar — color class names present in nodeTypes.js for Tailwind scanning */}
      <div className={`w-1.5 flex-shrink-0 ${config.color} rounded-l-[10px]`} />

      {/* Content */}
      <div className="flex-1 min-w-0 px-3 py-2.5 pr-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{config.icon}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-tight truncate mt-1">
          {data.label || config.label}
        </p>
        {data.fields?.length > 0 && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            {data.fields.length} campo{data.fields.length !== 1 ? 's' : ''}
          </p>
        )}
        {type === 'condition' && (
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] font-semibold text-emerald-600">✓ Sí</span>
            <span className="text-[10px] font-semibold text-rose-500">✗ No</span>
          </div>
        )}
        {type === 'decision' && (data.options || []).length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {(data.options || []).slice(0, 3).map(opt => (
              <span
                key={opt.id}
                className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full truncate max-w-[72px]"
              >
                {opt.label || '…'}
              </span>
            ))}
            {(data.options || []).length > 3 && (
              <span className="text-[10px] text-slate-400 py-0.5">
                +{(data.options || []).length - 3}
              </span>
            )}
          </div>
        )}
        {type === 'decision' && !(data.options || []).length && (
          <p className="text-[10px] text-slate-400 mt-0.5">Sin opciones</p>
        )}
      </div>

      {/* Output handles */}
      {type === 'decision' ? (
        (data.options || []).length > 0 ? (
          (data.options || []).map((opt, i, arr) => (
            <Handle
              key={opt.id}
              type="source"
              position={Position.Bottom}
              id={opt.id}
              style={{ left: `${((i + 1) / (arr.length + 1)) * 100}%` }}
              className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
            />
          ))
        ) : (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-white !border-2 !border-slate-300"
          />
        )
      ) : config.maxOutputs === 2 ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: '30%' }}
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white"
          />
        </>
      ) : config.maxOutputs === 1 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-white !border-2 !border-slate-300 hover:!border-blue-800"
        />
      ) : null}
    </div>
  )
}

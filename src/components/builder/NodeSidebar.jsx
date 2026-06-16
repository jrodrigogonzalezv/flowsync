import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

export default function NodeSidebar({ hasStart }) {
  function onDragStart(e, nodeType) {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-56 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nodos</h3>
        <p className="text-xs text-slate-400 mt-1">Arrastra al canvas</p>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        {Object.entries(NODE_TYPES_CONFIG).map(([type, config]) => {
          const disabled = type === 'start' && hasStart
          return (
          <div
            key={type}
            draggable={!disabled}
            onDragStart={disabled ? undefined : e => onDragStart(e, type)}
            title={disabled ? 'Solo puede haber un nodo de inicio' : undefined}
            className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 select-none transition-colors ${
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-grab active:cursor-grabbing hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${config.bgLight} border ${config.border} flex items-center justify-center text-sm flex-shrink-0`}>
              {config.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${config.textColor}`}>{config.label}</p>
              <p className="text-[11px] text-slate-400 leading-tight truncate">{config.description}</p>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

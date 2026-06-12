import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

export default function NodeSidebar() {
  function onDragStart(e, nodeType) {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nodos</h3>
        <p className="text-xs text-gray-500 mt-1">Arrastra al canvas</p>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        {Object.entries(NODE_TYPES_CONFIG).map(([type, config]) => (
          <div
            key={type}
            draggable
            onDragStart={e => onDragStart(e, type)}
            className={`flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-gray-800 cursor-grab active:cursor-grabbing hover:border-gray-500 transition-colors select-none`}
          >
            <div className={`w-8 h-8 rounded-lg ${config.bgLight} ${config.border} border flex items-center justify-center text-sm flex-shrink-0`}>
              {config.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${config.textColor}`}>{config.label}</p>
              <p className="text-[11px] text-gray-500 leading-tight truncate">{config.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

export default function NodeSidebar({ hasStart, isOpen, onToggle }) {
  function onDragStart(e, nodeType) {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className={`${isOpen ? 'w-56' : 'w-10'} bg-white border-r border-slate-200 flex flex-col shadow-sm transition-all duration-200 flex-shrink-0`}>
      <div className="p-3 border-b border-slate-100 flex items-center justify-between min-h-[52px]">
        {isOpen && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nodos</h3>
            <p className="text-xs text-slate-400 mt-0.5">Arrastra al canvas</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-600 transition-colors ml-auto flex-shrink-0"
          title={isOpen ? 'Contraer panel' : 'Expandir panel'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          {Object.entries(NODE_TYPES_CONFIG).map(([type, config]) => {
            const disabled = type === 'start' && hasStart
            return (
              <div
                key={type}
                draggable={!disabled}
                onDragStart={disabled ? undefined : e => onDragStart(e, type)}
                title={disabled ? 'Solo puede haber un nodo de inicio' : config.description}
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
      )}

      {!isOpen && (
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
          {Object.entries(NODE_TYPES_CONFIG).map(([type, config]) => {
            const disabled = type === 'start' && hasStart
            return (
              <div
                key={type}
                draggable={!disabled}
                onDragStart={disabled ? undefined : e => onDragStart(e, type)}
                title={disabled ? 'Solo puede haber un nodo de inicio' : config.label}
                className={`w-full flex items-center justify-center p-2 rounded-lg select-none transition-colors ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-grab active:cursor-grabbing hover:bg-slate-100'
                }`}
              >
                <span className="text-lg">{config.icon}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

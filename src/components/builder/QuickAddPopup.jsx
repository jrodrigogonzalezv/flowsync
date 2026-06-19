import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

export default function QuickAddPopup({ onSelect, hasStart }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-44 z-50">
      {Object.entries(NODE_TYPES_CONFIG).map(([type, config]) => {
        const disabled = type === 'start' && hasStart
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onSelect(type)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              disabled
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="text-base leading-none">{config.icon}</span>
            <span className={`font-medium text-[13px] ${disabled ? '' : config.textColor}`}>
              {config.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

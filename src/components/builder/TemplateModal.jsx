import { X } from 'lucide-react'
import { WORKFLOW_TEMPLATES } from '../../data/workflowTemplates'
import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

const CATEGORY_STYLE = {
  'básico':   'bg-slate-100 text-slate-600',
  'IA':       'bg-violet-100 text-violet-700',
  'decisión': 'bg-indigo-100 text-indigo-700',
}

export default function TemplateModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Plantillas de flujo</h3>
            <p className="text-sm text-slate-500 mt-0.5">Elige una base y personaliza todos los nodos.</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Blank option */}
          <button
            onClick={() => onSelect({ id: 'blank', name: '', nodes: [{ id: 'start-1', type: 'start', position: { x: 300, y: 80 }, data: { label: 'Inicio' } }], edges: [] })}
            className="w-full text-left p-4 mb-4 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50/40 transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors flex-shrink-0 text-xl">
              +
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-800 transition-colors">Flujo en blanco</p>
              <p className="text-xs text-slate-400">Empieza desde cero con solo el nodo de inicio.</p>
            </div>
          </button>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">O elige una plantilla</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WORKFLOW_TEMPLATES.map(template => {
              const usedTypes = [...new Set(template.nodes.map(n => n.type))]
              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="text-left p-5 border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl leading-none mt-0.5">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-800 transition-colors">
                          {template.name}
                        </h4>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_STYLE[template.category] || 'bg-slate-100 text-slate-600'}`}>
                          {template.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {usedTypes.map(type => {
                      const config = NODE_TYPES_CONFIG[type]
                      if (!config) return null
                      return (
                        <span
                          key={type}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.bgLight} ${config.textColor} ${config.border}`}
                        >
                          {config.icon} {config.label}
                        </span>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

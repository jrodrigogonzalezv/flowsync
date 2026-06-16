import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

const FIELD_TYPES = [
  { value: 'text',        label: 'Texto corto' },
  { value: 'textarea',    label: 'Texto largo' },
  { value: 'email',       label: 'Email' },
  { value: 'phone',       label: 'Teléfono' },
  { value: 'number',      label: 'Número' },
  { value: 'date',        label: 'Fecha' },
  { value: 'select',      label: 'Lista desplegable' },
  { value: 'multiselect', label: 'Selección múltiple' },
  { value: 'scale',       label: 'Escala / Valoración' },
  { value: 'file',        label: 'Archivo' },
]

export default function NodeConfigPanel({ node, onChange, onClose, onDeleteOptionEdge }) {
  const [data, setData] = useState(node.data)
  const config = NODE_TYPES_CONFIG[node.type] || {}

  useEffect(() => { setData(node.data) }, [node.id])

  function update(field, value) {
    const next = { ...data, [field]: value }
    setData(next)
    onChange(node.id, next)
  }

  function addField() {
    update('fields', [...(data.fields || []), { id: Date.now().toString(), label: 'Campo nuevo', type: 'text', required: false }])
  }

  function updateField(idx, patch) {
    update('fields', (data.fields || []).map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  function removeField(idx) {
    update('fields', (data.fields || []).filter((_, i) => i !== idx))
  }

  function addOption() {
    update('options', [...(data.options || []), { id: Date.now().toString(), label: '' }])
  }

  function updateOption(idx, label) {
    update('options', (data.options || []).map((o, i) => i === idx ? { ...o, label } : o))
  }

  function removeOption(idx) {
    const removed = (data.options || [])[idx]
    update('options', (data.options || []).filter((_, i) => i !== idx))
    if (removed?.id) onDeleteOptionEdge?.(node.id, removed.id)
  }

  const inputClass = "w-full border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400 bg-white"

  return (
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre del paso</label>
          <input value={data.label || ''} onChange={e => update('label', e.target.value)} className={inputClass} placeholder="Ej: Recolectar datos iniciales" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1.5">Descripción</label>
          <textarea value={data.description || ''} onChange={e => update('description', e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Descripción visible para el cliente. Puedes usar {{clientName}}" />
        </div>

        {node.type === 'form' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Campos del formulario</label>
              <button onClick={addField} className="flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900 font-medium">
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {(data.fields || []).map((field, i) => (
                <FieldConfig key={field.id} field={field} index={i} onUpdate={p => updateField(i, p)} onRemove={() => removeField(i)} inputClass={inputClass} />
              ))}
              {!data.fields?.length && <p className="text-xs text-slate-400 text-center py-3">Sin campos — agrega uno</p>}
            </div>
          </div>
        )}

        {node.type === 'ai' && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Instrucción para la IA</label>
            <textarea value={data.aiPrompt || ''} onChange={e => update('aiPrompt', e.target.value)} rows={4}
              className={`${inputClass} resize-none`} placeholder="Ej: Analiza si el cliente cumple los requisitos según la base de conocimiento..." />
          </div>
        )}

        {node.type === 'condition' && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Condición</label>
            <textarea value={data.condition || ''} onChange={e => update('condition', e.target.value)} rows={3}
              className={`${inputClass} resize-none`} placeholder="Ej: El cliente tiene más de 2 años de experiencia" />
            <p className="text-xs text-slate-400 mt-1">Salida verde = Sí · Salida roja = No</p>
          </div>
        )}

        {node.type === 'notification' && (
          <>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Asunto del email</label>
              <input value={data.subject || ''} onChange={e => update('subject', e.target.value)} className={inputClass} placeholder="Ej: Actualización de tu proceso" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Mensaje al cliente</label>
              <textarea value={data.message || ''} onChange={e => update('message', e.target.value)} rows={4}
                className={`${inputClass} resize-none`} placeholder="Mensaje a enviar. Puedes usar {{clientName}}" />
            </div>
          </>
        )}

        {node.type === 'decision' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Opciones</label>
              <button onClick={addOption} className="flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-medium">
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {(data.options || []).map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <input
                    value={opt.label}
                    onChange={e => updateOption(i, e.target.value)}
                    className="flex-1 bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder-slate-400"
                    placeholder={`Opción ${i + 1}`}
                  />
                  <button onClick={() => removeOption(i)} className="text-indigo-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {!(data.options || []).length && <p className="text-xs text-slate-400 text-center py-3">Sin opciones — agrega una</p>}
            </div>
            <p className="text-xs text-slate-400 mt-2">Cada opción genera un conector desde el nodo.</p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">Variables disponibles: <code className="bg-slate-100 px-1 rounded">{'{{clientName}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{clientEmail}}'}</code></p>
        </div>
      </div>
    </div>
  )
}

function FieldConfig({ field, onUpdate, onRemove, inputClass }) {
  const needsOptions = field.type === 'select' || field.type === 'multiselect'
  const isScale = field.type === 'scale'

  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={field.label}
          onChange={e => onUpdate({ label: e.target.value })}
          className="flex-1 border border-slate-300 text-slate-900 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-800 bg-white"
          placeholder="Etiqueta del campo"
        />
        <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={field.type}
          onChange={e => onUpdate({ type: e.target.value, options: undefined, max: undefined, style: undefined })}
          className="flex-1 border border-slate-300 text-slate-900 rounded px-2 py-1 text-xs focus:outline-none bg-white"
        >
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer flex-shrink-0">
          <input type="checkbox" checked={field.required || false} onChange={e => onUpdate({ required: e.target.checked })} className="accent-blue-800" />
          Req.
        </label>
      </div>

      {/* Placeholder */}
      {!needsOptions && !isScale && (
        <input
          value={field.placeholder || ''}
          onChange={e => onUpdate({ placeholder: e.target.value })}
          className="w-full border border-slate-300 text-slate-900 rounded px-2 py-1 text-xs focus:outline-none bg-white placeholder-slate-400"
          placeholder="Texto de ayuda (placeholder)"
        />
      )}

      {/* Options for select / multiselect */}
      {needsOptions && (
        <div className="space-y-1">
          {(field.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={opt}
                onChange={e => {
                  const newOpts = [...(field.options || [])]
                  newOpts[i] = e.target.value
                  onUpdate({ options: newOpts })
                }}
                className="flex-1 border border-slate-200 text-slate-900 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                placeholder={`Opción ${i + 1}`}
              />
              <button
                onClick={() => onUpdate({ options: (field.options || []).filter((_, j) => j !== i) })}
                className="text-slate-300 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onUpdate({ options: [...(field.options || []), ''] })}
            className="text-xs text-blue-800 hover:text-blue-900 font-medium flex items-center gap-1 mt-1"
          >
            <Plus className="w-3 h-3" /> Agregar opción
          </button>
        </div>
      )}

      {/* Scale config */}
      {isScale && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 w-12">Máximo</label>
            <select
              value={field.max || 5}
              onChange={e => onUpdate({ max: Number(e.target.value) })}
              className="flex-1 border border-slate-200 text-slate-900 rounded px-2 py-1 text-xs bg-white focus:outline-none"
            >
              {[5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={field.style || 'numbers'}
              onChange={e => onUpdate({ style: e.target.value })}
              className="flex-1 border border-slate-200 text-slate-900 rounded px-2 py-1 text-xs bg-white focus:outline-none"
            >
              <option value="numbers">Números</option>
              <option value="stars">Estrellas</option>
            </select>
          </div>
          {field.style !== 'stars' && (
            <div className="flex items-center gap-2">
              <input
                value={(field.labels || {})[1] || ''}
                onChange={e => onUpdate({ labels: { ...(field.labels || {}), 1: e.target.value } })}
                className="flex-1 border border-slate-200 text-slate-900 rounded px-2 py-1 text-xs bg-white focus:outline-none placeholder-slate-400"
                placeholder="Etiqueta mín."
              />
              <input
                value={(field.labels || {})[field.max || 5] || ''}
                onChange={e => onUpdate({ labels: { ...(field.labels || {}), [field.max || 5]: e.target.value } })}
                className="flex-1 border border-slate-200 text-slate-900 rounded px-2 py-1 text-xs bg-white focus:outline-none placeholder-slate-400"
                placeholder="Etiqueta máx."
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

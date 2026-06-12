import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { NODE_TYPES_CONFIG } from './nodes/nodeTypes'

export default function NodeConfigPanel({ node, onChange, onClose }) {
  const [data, setData] = useState(node.data)
  const config = NODE_TYPES_CONFIG[node.type] || {}

  useEffect(() => {
    setData(node.data)
  }, [node.id])

  function update(field, value) {
    const next = { ...data, [field]: value }
    setData(next)
    onChange(node.id, next)
  }

  function addField() {
    const fields = [...(data.fields || []), { id: Date.now().toString(), label: 'Campo nuevo', type: 'text', required: false }]
    update('fields', fields)
  }

  function updateField(idx, patch) {
    const fields = (data.fields || []).map((f, i) => i === idx ? { ...f, ...patch } : f)
    update('fields', fields)
  }

  function removeField(idx) {
    const fields = (data.fields || []).filter((_, i) => i !== idx)
    update('fields', fields)
  }

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
      <div className={`p-4 border-b border-gray-800 flex items-center justify-between ${config.bgLight}`}>
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Nombre del paso</label>
          <input
            value={data.label || ''}
            onChange={e => update('label', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Ej: Recolectar datos iniciales"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Descripción</label>
          <textarea
            value={data.description || ''}
            onChange={e => update('description', e.target.value)}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="Descripción visible para el cliente"
          />
        </div>

        {node.type === 'form' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Campos del formulario</label>
              <button
                onClick={addField}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {(data.fields || []).map((field, i) => (
                <div key={field.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={field.label}
                      onChange={e => updateField(i, { label: e.target.value })}
                      className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="Etiqueta del campo"
                    />
                    <button onClick={() => removeField(i)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={field.type}
                      onChange={e => updateField(i, { type: e.target.value })}
                      className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="text">Texto corto</option>
                      <option value="textarea">Texto largo</option>
                      <option value="select">Selección</option>
                      <option value="file">Archivo</option>
                      <option value="date">Fecha</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(i, { required: e.target.checked })}
                        className="accent-indigo-500"
                      />
                      Req.
                    </label>
                  </div>
                </div>
              ))}
              {!(data.fields?.length) && (
                <p className="text-xs text-gray-500 text-center py-2">Sin campos — agrega uno</p>
              )}
            </div>
          </div>
        )}

        {node.type === 'ai' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Instrucción para la IA</label>
            <textarea
              value={data.aiPrompt || ''}
              onChange={e => update('aiPrompt', e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Ej: Analiza si el cliente cumple los requisitos según la base de conocimiento..."
            />
          </div>
        )}

        {node.type === 'condition' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Condición</label>
            <textarea
              value={data.condition || ''}
              onChange={e => update('condition', e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Ej: El cliente tiene más de 2 años de experiencia"
            />
            <p className="text-xs text-gray-500 mt-1">Salida verde = Sí · Salida roja = No</p>
          </div>
        )}

        {node.type === 'notification' && (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Asunto</label>
              <input
                value={data.subject || ''}
                onChange={e => update('subject', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Asunto del email"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mensaje</label>
              <textarea
                value={data.message || ''}
                onChange={e => update('message', e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Mensaje a enviar al cliente..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

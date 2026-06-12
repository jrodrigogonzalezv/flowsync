import { useState } from 'react'
import { Loader2, ChevronRight } from 'lucide-react'
import { NODE_TYPES_CONFIG } from '../builder/nodes/nodeTypes'

export default function FlowStep({ step, stepNumber, totalSteps, submitting, onSubmit }) {
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const config = NODE_TYPES_CONFIG[step.type] || {}

  function validate() {
    const errs = {}
    for (const field of (step.data.fields || [])) {
      if (field.required && !values[field.id]?.toString().trim()) {
        errs[field.id] = 'Este campo es obligatorio'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (step.type === 'form' && !validate()) return
    onSubmit(values)
  }

  function updateValue(fieldId, value) {
    setValues(v => ({ ...v, [fieldId]: value }))
    if (errors[fieldId]) setErrors(e => ({ ...e, [fieldId]: '' }))
  }

  return (
    <div>
      {/* Step badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgLight} border ${config.border} mb-6`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-semibold ${config.textColor} uppercase tracking-wider`}>
          {config.label} · {stepNumber}/{totalSteps}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        {step.data.label || config.label}
      </h2>
      {step.data.description && (
        <p className="text-gray-400 mb-8 leading-relaxed">{step.data.description}</p>
      )}

      <form onSubmit={handleSubmit}>
        {step.type === 'form' && (
          <div className="space-y-5 mb-8">
            {(step.data.fields || []).map(field => (
              <FormField
                key={field.id}
                field={field}
                value={values[field.id] || ''}
                error={errors[field.id]}
                onChange={v => updateValue(field.id, v)}
              />
            ))}
            {!step.data.fields?.length && (
              <p className="text-gray-500 text-sm">Este paso no tiene campos configurados.</p>
            )}
          </div>
        )}

        {step.type === 'ai' && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 mb-8 space-y-3">
            <p className="text-purple-300 text-sm leading-relaxed">
              {step.data.description || 'La IA analizará tus respuestas. Haz click en Continuar para procesar.'}
            </p>
            <p className="text-gray-500 text-xs">El análisis puede tomar unos segundos.</p>
          </div>
        )}

        {step.type === 'condition' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
            <p className="text-yellow-300 text-sm">{step.data.condition || 'Se evaluará una condición.'}</p>
          </div>
        )}

        {step.type === 'notification' && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 mb-8">
            <p className="text-orange-300 text-sm">
              {step.data.message || 'Se enviará una notificación.'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-8 py-3 rounded-xl transition-colors"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : <>{stepNumber === totalSteps ? 'Finalizar' : 'Continuar'} <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </form>
    </div>
  )
}

function FormField({ field, value, error, onChange }) {
  const base = `w-full bg-gray-900 border text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
    error ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-indigo-500'
  }`

  return (
    <div>
      <label className="text-sm font-medium text-gray-200 block mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={4}
          className={`${base} resize-none`}
          placeholder={`Ingresa ${field.label.toLowerCase()}...`}
        />
      ) : field.type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={base}>
          <option value="">Selecciona una opción</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.type === 'date' ? (
        <input type="date" value={value} onChange={e => onChange(e.target.value)} className={base} />
      ) : field.type === 'file' ? (
        <input type="file" onChange={e => onChange(e.target.files[0]?.name || '')} className={base} />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={base}
          placeholder={`Ingresa ${field.label.toLowerCase()}...`}
        />
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

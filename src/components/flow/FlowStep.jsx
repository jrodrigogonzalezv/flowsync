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

  const inputClass = (hasError) => `w-full border ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-blue-800 focus:ring-blue-800/20'} text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors placeholder-slate-400 bg-white`

  return (
    <div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgLight} border ${config.border} mb-6`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-bold ${config.textColor} uppercase tracking-wider`}>
          {config.label} · {stepNumber}/{totalSteps}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">{step.data.label || config.label}</h2>
      {step.data.description && (
        <p className="text-slate-500 mb-8 leading-relaxed">{step.data.description}</p>
      )}

      <form onSubmit={handleSubmit}>
        {step.type === 'form' && (
          <div className="space-y-5 mb-8">
            {(step.data.fields || []).map(field => (
              <FormField key={field.id} field={field} value={values[field.id] || ''} error={errors[field.id]} onChange={v => updateValue(field.id, v)} inputClass={inputClass} />
            ))}
            {!step.data.fields?.length && (
              <p className="text-slate-400 text-sm">Este paso no tiene campos configurados.</p>
            )}
          </div>
        )}

        {step.type === 'ai' && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 mb-8">
            <p className="text-violet-700 text-sm leading-relaxed font-medium">
              {step.data.description || 'La IA analizará tus respuestas anteriores.'}
            </p>
            <p className="text-violet-400 text-xs mt-2">El análisis puede tomar unos segundos.</p>
          </div>
        )}

        {step.type === 'condition' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <p className="text-amber-700 text-sm font-medium">{step.data.condition || 'Se evaluará una condición.'}</p>
          </div>
        )}

        {step.type === 'notification' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8">
            <p className="text-orange-700 text-sm font-medium">{step.data.message || 'Se enviará una notificación.'}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-sm"
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

function FormField({ field, value, error, onChange, inputClass }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 block mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
          className={`${inputClass(error)} resize-none`} placeholder={`Ingresa ${field.label.toLowerCase()}...`} />
      ) : field.type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={inputClass(error)}>
          <option value="">Selecciona una opción</option>
          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : field.type === 'date' ? (
        <input type="date" value={value} onChange={e => onChange(e.target.value)} className={inputClass(error)} />
      ) : field.type === 'file' ? (
        <input type="file" onChange={e => onChange(e.target.files[0]?.name || '')} className={inputClass(error)} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className={inputClass(error)} placeholder={`Ingresa ${field.label.toLowerCase()}...`} />
      )}

      {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}

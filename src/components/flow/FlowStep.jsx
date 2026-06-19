import { useState, useRef, useEffect } from 'react'
import { Loader2, ChevronRight, Star, Upload, X, FileText, CheckCircle, PenLine, RotateCcw } from 'lucide-react'
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { NODE_TYPES_CONFIG } from '../builder/nodes/nodeTypes'
import { generateSignatureCertificate } from '../../lib/generateCertificate'

function resolveVars(text, vars) {
  if (!text || !vars) return text
  return text
    .replace(/\{\{clientName\}\}/g, vars.clientName || '')
    .replace(/\{\{clientEmail\}\}/g, vars.clientEmail || '')
}

export default function FlowStep({ step, stepNumber, totalSteps, submitting, onSubmit, clientData, executionId, orgId }) {
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const config = NODE_TYPES_CONFIG[step.type] || {}

  const vars = clientData || {}

  function validate() {
    const errs = {}
    for (const field of (step.data.fields || [])) {
      if (!field.required) continue
      const val = values[field.id]
      if (field.type === 'multiselect') {
        if (!val || val.length === 0) errs[field.id] = 'Selecciona al menos una opción'
      } else if (!val?.toString().trim()) {
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

  const inputClass = (hasError) =>
    `w-full border ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-blue-800 focus:ring-blue-800/20'} text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors placeholder-slate-400 bg-white`

  return (
    <div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgLight} border ${config.border} mb-6`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-bold ${config.textColor} uppercase tracking-wider`}>
          {config.label} · {stepNumber}/{totalSteps}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        {resolveVars(step.data.label || config.label, vars)}
      </h2>
      {step.data.description && (
        <p className="text-slate-500 mb-8 leading-relaxed">
          {resolveVars(step.data.description, vars)}
        </p>
      )}

      {step.type === 'upload' && (
        <UploadStep
          step={step}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          executionId={executionId}
          orgId={orgId}
          onSubmit={onSubmit}
        />
      )}

      {step.type === 'signature' && (
        <SignatureStep
          step={step}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          executionId={executionId}
          orgId={orgId}
          signerEmail={clientData?.clientEmail}
          onSubmit={onSubmit}
        />
      )}

      <form onSubmit={handleSubmit} style={{ display: (step.type === 'upload' || step.type === 'signature') ? 'none' : undefined }}>
        {step.type === 'form' && (
          <div className="space-y-5 mb-8">
            {(step.data.fields || []).map(field => (
              <FormField
                key={field.id}
                field={field}
                value={values[field.id]}
                error={errors[field.id]}
                onChange={v => updateValue(field.id, v)}
                inputClass={inputClass}
              />
            ))}
            {!step.data.fields?.length && (
              <p className="text-slate-400 text-sm">Este paso no tiene campos configurados.</p>
            )}
          </div>
        )}

        {step.type === 'ai' && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 mb-8">
            <p className="text-violet-700 text-sm leading-relaxed font-medium">
              {resolveVars(step.data.description || 'La IA analizará tus respuestas anteriores.', vars)}
            </p>
            <p className="text-violet-400 text-xs mt-2">El análisis puede tomar unos segundos.</p>
          </div>
        )}

        {step.type === 'condition' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <p className="text-amber-700 text-sm font-medium">
              {resolveVars(step.data.condition || 'Se evaluará una condición.', vars)}
            </p>
          </div>
        )}

        {step.type === 'notification' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8">
            <p className="text-orange-700 text-sm font-medium">
              {resolveVars(step.data.message || 'Se enviará una notificación.', vars)}
            </p>
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

function UploadStep({ step, stepNumber, totalSteps, executionId, orgId, onSubmit }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({})
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef()

  const maxFiles = step.data.maxFiles || 5
  const acceptedTypes = step.data.acceptedTypes || ['pdf', 'image', 'docx']
  const acceptAttr = [
    acceptedTypes.includes('pdf') ? '.pdf' : null,
    acceptedTypes.includes('image') ? 'image/*' : null,
    acceptedTypes.includes('docx') ? '.docx,.doc' : null,
  ].filter(Boolean).join(',')

  function addFiles(incoming) {
    const remaining = maxFiles - files.length
    const toAdd = Array.from(incoming).slice(0, remaining)
    setFiles(prev => [...prev, ...toAdd])
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function onDrop(e) {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!files.length) return
    setUploading(true)
    setUploadError('')

    try {
      const uploaded = []
      for (const file of files) {
        const fileId = crypto.randomUUID()
        const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
        const storagePath = `client-docs/${orgId}/${executionId}/${step.id}/${fileId}${ext ? '.' + ext : ''}`
        const storageRef = ref(storage, storagePath)

        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file)
          task.on('state_changed',
            snap => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              setProgress(p => ({ ...p, [fileId]: pct }))
            },
            reject,
            async () => {
              const downloadURL = await getDownloadURL(task.snapshot.ref)
              uploaded.push({ id: fileId, name: file.name, size: file.size, type: file.type, storagePath, downloadURL, uploadedAt: new Date().toISOString() })
              resolve()
            }
          )
        })
      }
      onSubmit({ uploadedFiles: uploaded })
    } catch {
      setUploadError('Error al subir archivos. Intenta de nuevo.')
      setUploading(false)
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <form onSubmit={handleUpload}>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center mb-5 transition-all cursor-pointer
          ${files.length >= maxFiles ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-teal-300 bg-teal-50/40 hover:border-teal-500 hover:bg-teal-50'}`}
      >
        <Upload className="w-8 h-8 text-teal-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700 mb-1">
          {files.length >= maxFiles ? `Máximo ${maxFiles} archivo${maxFiles !== 1 ? 's' : ''}` : 'Arrastra archivos aquí o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-slate-400">{acceptedTypes.map(t => t === 'image' ? 'JPG/PNG' : t.toUpperCase()).join(' · ')}</p>
        <input ref={inputRef} type="file" multiple={maxFiles > 1} accept={acceptAttr} className="hidden"
          onChange={e => addFiles(e.target.files)} disabled={uploading || files.length >= maxFiles} />
      </div>

      {step.data.instructions && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm text-teal-800">{step.data.instructions}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2 mb-6">
          {files.map((file, idx) => {
            const fileId = Object.keys(progress)[idx]
            const pct = fileId ? (progress[fileId] ?? 0) : 0
            const done = pct === 100
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  {done
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate font-medium">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                  </div>
                  {!uploading && (
                    <button type="button" onClick={e => { e.stopPropagation(); removeFile(idx) }} className="text-slate-300 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {uploading && (
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {uploadError && <p className="text-red-500 text-sm mb-4">⚠ {uploadError}</p>}

      <button
        type="submit"
        disabled={!files.length || uploading}
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-sm"
      >
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
          : <><Upload className="w-4 h-4" /> Enviar documentos</>
        }
      </button>
    </form>
  )
}

function SignatureStep({ step, stepNumber, totalSteps, executionId, orgId, signerEmail, onSubmit }) {
  const [mode, setMode] = useState('draw')
  const [typedName, setTypedName] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const canvasRef = useRef(null)
  const lastPos = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }, [mode])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY }
  }

  function startDraw(e) {
    e.preventDefault()
    lastPos.current = getPos(e, canvasRef.current)
    setIsDrawing(true)
  }

  function draw(e) {
    e.preventDefault()
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasSignature(true)
  }

  function stopDraw() { setIsDrawing(false); lastPos.current = null }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSign(e) {
    e.preventDefault()
    setUploading(true)
    setUploadError('')

    try {
      let ipAddress = 'unknown'
      try {
        const ipRes = await Promise.race([
          fetch('https://api.ipify.org?format=json').then(r => r.json()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ])
        ipAddress = ipRes.ip || 'unknown'
      } catch {}

      let imageBlob
      if (mode === 'draw') {
        imageBlob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'))
      } else {
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 180
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.font = 'italic 52px Georgia, serif'
        ctx.fillStyle = '#1e293b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
        imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      }

      const signedAt = new Date().toISOString()
      const storagePath = `signatures/${orgId}/${executionId}/${step.id}.png`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, imageBlob)
      const imageUrl = await getDownloadURL(storageRef)

      // Generate certificate PDF with QR code
      let certificateUrl = null
      try {
        const certBlob = await generateSignatureCertificate({
          signatureImageBlob: imageBlob,
          signerEmail: signerEmail || '',
          signedAt,
          ipAddress,
          method: mode,
          executionId,
          nodeId: step.id,
          documentTitle: step.data.label,
        })
        const certPath = `signatures/${orgId}/${executionId}/${step.id}_certificate.pdf`
        const certRef = ref(storage, certPath)
        await uploadBytes(certRef, certBlob)
        certificateUrl = await getDownloadURL(certRef)
      } catch (certErr) {
        console.warn('Certificate generation failed, continuing without it:', certErr)
      }

      onSubmit({
        type: 'signature',
        imageUrl,
        certificateUrl,
        signedAt,
        signerEmail: signerEmail || '',
        ipAddress,
        userAgent: navigator.userAgent,
        method: mode,
        ...(mode === 'type' && { typedName }),
        storagePath,
      })
    } catch {
      setUploadError('Error al guardar la firma. Intenta de nuevo.')
      setUploading(false)
    }
  }

  const canSign = mode === 'draw' ? hasSignature : typedName.trim().length > 0

  return (
    <form onSubmit={handleSign}>
      <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-5">
        <p className="text-xs text-purple-700 leading-relaxed">
          <strong>Firma Electrónica Simple</strong> — Válida en Chile según la <strong>Ley 19.799</strong>.
          Al firmar se registra: fecha, hora, dirección IP y tu email ({signerEmail || 'no disponible'}).
        </p>
      </div>

      {step.data.instructions && (
        <p className="text-slate-500 text-sm mb-5 leading-relaxed">{step.data.instructions}</p>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
        {[{ key: 'draw', label: 'Dibujar' }, { key: 'type', label: 'Escribir nombre' }].map(tab => (
          <button key={tab.key} type="button" onClick={() => setMode(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === tab.key
                ? 'bg-white text-purple-800 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'draw' ? (
        <div className="mb-5">
          <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full block"
              style={{ cursor: 'crosshair', touchAction: 'none' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <p className="text-slate-300 text-sm">Dibuja tu firma aquí</p>
              </div>
            )}
          </div>
          {hasSignature && (
            <div className="flex justify-end mt-2">
              <button type="button" onClick={clearCanvas}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Limpiar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-5">
          <input type="text" value={typedName} onChange={e => setTypedName(e.target.value)}
            placeholder="Tu nombre completo"
            className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 placeholder-slate-400"
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          />
          {typedName && (
            <div className="mt-3 border-2 border-slate-200 rounded-xl p-5 bg-white flex items-center justify-center min-h-[80px]">
              <span className="text-3xl text-slate-800" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                {typedName}
              </span>
            </div>
          )}
        </div>
      )}

      {uploadError && <p className="text-red-500 text-sm mb-4">⚠ {uploadError}</p>}

      <button type="submit" disabled={!canSign || uploading}
        className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-sm">
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando firma...</>
          : <><PenLine className="w-4 h-4" /> {stepNumber === totalSteps ? 'Firmar y finalizar' : 'Firmar y continuar'}</>
        }
      </button>
    </form>
  )
}

function FormField({ field, value, error, onChange, inputClass }) {
  if (field.type === 'scale') {
    const max = field.max || 5
    const labels = field.labels || {}
    return (
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-3">
          {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.style === 'stars' ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${Number(value) >= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                />
              </button>
            ))}
            {value && <span className="text-sm text-slate-500 ml-2">{value} / {max}</span>}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              {Array.from({ length: max }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all ${
                    Number(value) === n
                      ? 'border-blue-800 bg-blue-800 text-white shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-800'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {(labels[1] || labels[max]) && (
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-slate-400">{labels[1] || 'Muy bajo'}</span>
                <span className="text-xs text-slate-400">{labels[max] || 'Muy alto'}</span>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-xs mt-1.5">⚠ {error}</p>}
      </div>
    )
  }

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">
          {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          {(field.options || []).map(opt => {
            const checked = selected.includes(opt)
            return (
              <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                checked ? 'border-blue-800 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  checked ? 'border-blue-800 bg-blue-800' : 'border-slate-300'
                }`}>
                  {checked && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className={`text-sm font-medium ${checked ? 'text-blue-900' : 'text-slate-700'}`}>{opt}</span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={checked}
                  onChange={e => {
                    if (e.target.checked) onChange([...selected, opt])
                    else onChange(selected.filter(s => s !== opt))
                  }}
                />
              </label>
            )
          })}
        </div>
        {error && <p className="text-red-500 text-xs mt-1.5">⚠ {error}</p>}
      </div>
    )
  }

  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 block mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={4}
          className={`${inputClass(error)} resize-none`}
          placeholder={field.placeholder || `Ingresa ${field.label.toLowerCase()}...`}
        />
      ) : field.type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} className={inputClass(error)}>
          <option value="">Selecciona una opción</option>
          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : field.type === 'date' ? (
        <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className={inputClass(error)} />
      ) : field.type === 'phone' ? (
        <input type="tel" value={value || ''} onChange={e => onChange(e.target.value)} className={inputClass(error)} placeholder={field.placeholder || '+56 9 1234 5678'} />
      ) : field.type === 'email' ? (
        <input type="email" value={value || ''} onChange={e => onChange(e.target.value)} className={inputClass(error)} placeholder={field.placeholder || 'tu@email.com'} />
      ) : field.type === 'number' ? (
        <input type="number" value={value || ''} onChange={e => onChange(e.target.value)} className={inputClass(error)} placeholder={field.placeholder || '0'} />
      ) : field.type === 'file' ? (
        <input type="file" onChange={e => onChange(e.target.files[0]?.name || '')} className={inputClass(error)} />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={inputClass(error)}
          placeholder={field.placeholder || `Ingresa ${field.label.toLowerCase()}...`}
        />
      )}

      {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}

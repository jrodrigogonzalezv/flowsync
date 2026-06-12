import { useState, useRef } from 'react'
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { storage } from '../../lib/firebase'
import { X, Upload, Loader2, FileText, Image, File, Trash2 } from 'lucide-react'

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'text/plain': 'txt',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
}

function FileIcon({ type }) {
  if (type === 'image') return <Image className="w-4 h-4 text-purple-600" />
  if (type === 'pdf') return <FileText className="w-4 h-4 text-red-500" />
  if (type === 'docx') return <FileText className="w-4 h-4 text-blue-600" />
  return <File className="w-4 h-4 text-slate-500" />
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function KnowledgeBaseModal({
  knowledgeBase, onChangeKnowledgeBase,
  kbFiles, onAddFile, onDeleteFile,
  userId, workflowFolder, onClose,
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef()

  async function processFile(file) {
    const fileType = ACCEPTED_TYPES[file.type]
    if (!fileType) {
      setUploadError(`Tipo no soportado: "${file.name}". Usa PDF, Word, imagen o .txt`)
      return
    }
    setUploadError('')
    setUploading({ name: file.name, progress: 0 })
    try {
      const path = `kb/${userId}/${workflowFolder}/${Date.now()}_${file.name}`
      const sRef = storageRef(storage, path)

      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file, { contentType: file.type })
        task.on(
          'state_changed',
          snap => setUploading(prev => ({ ...prev, progress: Math.round((snap.bytesTransferred / snap.totalBytes) * 80) })),
          reject,
          resolve,
        )
      })

      const downloadURL = await getDownloadURL(sRef)
      setUploading(prev => ({ ...prev, progress: 85 }))

      const fns = getFunctions()
      const extract = httpsCallable(fns, 'extractKnowledgeBaseFile')
      const result = await extract({ storagePath: path, fileType, mimeType: file.type })

      setUploading(prev => ({ ...prev, progress: 100 }))

      onAddFile({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        storagePath: path,
        downloadURL,
        extractedText: result.data.extractedText || '',
        type: fileType,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      })
    } catch (err) {
      setUploadError(`Error al procesar "${file.name}": ${err.message}`)
    } finally {
      setUploading(null)
    }
  }

  async function handleDelete(kbFile) {
    try {
      await deleteObject(storageRef(storage, kbFile.storagePath))
    } catch { /* archivo ya eliminado */ }
    onDeleteFile(kbFile.id)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(processFile)
  }

  function handleFileInput(e) {
    Array.from(e.target.files).forEach(processFile)
    e.target.value = ''
  }

  const totalChars = [knowledgeBase, ...kbFiles.map(f => f.extractedText)]
    .filter(Boolean)
    .join('')
    .length

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl flex flex-col max-h-[88vh] shadow-xl">

        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-slate-900 font-semibold">Base de conocimiento</h3>
            <p className="text-slate-500 text-sm mt-0.5">La IA usará este contenido para analizar las respuestas de tus clientes.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Texto manual</label>
            <textarea
              value={knowledgeBase}
              onChange={e => onChangeKnowledgeBase(e.target.value)}
              rows={7}
              className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 resize-none font-mono leading-relaxed placeholder-slate-400"
              placeholder="Pega aquí criterios de evaluación, requisitos, preguntas frecuentes, políticas, etc."
            />
            <p className="text-slate-400 text-xs mt-1">{knowledgeBase.length} caracteres</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Documentos</label>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragOver
                  ? 'border-blue-800 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              } ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,image/*"
                multiple
                onChange={handleFileInput}
              />
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
              <p className="text-xs text-slate-400 mt-1">PDF · Word (.docx) · Imágenes (JPG, PNG, WebP) · Texto (.txt)</p>
            </div>

            {uploading && (
              <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-blue-700 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-800 truncate">{uploading.name}</p>
                  <div className="mt-1.5 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 rounded-full transition-all duration-300"
                      style={{ width: `${uploading.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-blue-700 font-medium flex-shrink-0">
                  {uploading.progress < 85 ? 'Subiendo...' : 'Extrayendo texto...'}
                </span>
              </div>
            )}

            {uploadError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>
            )}

            {kbFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {kbFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                    <FileIcon type={f.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium truncate">{f.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatBytes(f.size)} · {f.extractedText.length.toLocaleString()} caracteres extraídos
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(f)}
                      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">
            Total disponible para la IA:{' '}
            <span className="font-semibold text-slate-600">{totalChars.toLocaleString()} caracteres</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

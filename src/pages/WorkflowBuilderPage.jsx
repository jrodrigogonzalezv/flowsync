import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import WorkflowBuilder from '../components/builder/WorkflowBuilder'
import { ArrowLeft, Loader2, BookOpen, X } from 'lucide-react'

export default function WorkflowBuilderPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState(null)
  const [name, setName] = useState('Flujo sin nombre')
  const [knowledgeBase, setKnowledgeBase] = useState('')
  const [showKB, setShowKB] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isNew = id === 'new'

  useEffect(() => {
    if (isNew) { setLoading(false); return }
    getDoc(doc(db, 'workflows', id)).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        setWorkflow(data)
        setName(data.name || 'Flujo sin nombre')
        setKnowledgeBase(data.knowledgeBase || '')
      }
      setLoading(false)
    })
  }, [id])

  async function handleSave({ nodes, edges }) {
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        name,
        knowledgeBase,
        nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map(e => ({
          id: e.id, source: e.source, target: e.target,
          sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null,
        })),
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }
      if (isNew) {
        const ref = doc(collection(db, 'workflows'))
        await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
        navigate(`/workflows/${ref.id}`, { replace: true })
      } else {
        await updateDoc(doc(db, 'workflows', id), payload)
      }
    } catch (e) {
      setSaveError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-gray-950">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
        <button onClick={() => navigate('/workflows')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-transparent text-white font-semibold text-lg focus:outline-none border-b border-transparent focus:border-gray-500 px-1 transition-colors flex-1 min-w-0"
          placeholder="Nombre del flujo"
        />
        {saveError && <span className="text-red-400 text-xs">{saveError}</span>}
        <button
          onClick={() => setShowKB(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:block">Base de conocimiento</span>
          {knowledgeBase && <span className="w-2 h-2 bg-indigo-400 rounded-full" />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowBuilder workflow={workflow} onSave={handleSave} saving={saving} />
      </div>

      {showKB && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h3 className="text-white font-semibold">Base de conocimiento</h3>
                <p className="text-gray-400 text-sm mt-0.5">La IA usará este texto para analizar las respuestas de tus clientes.</p>
              </div>
              <button onClick={() => setShowKB(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={knowledgeBase}
                onChange={e => setKnowledgeBase(e.target.value)}
                rows={14}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
                placeholder="Pega aquí tu base de conocimiento: criterios de evaluación, requisitos, preguntas frecuentes, políticas, etc.

Ejemplo:
- El cliente debe tener al menos 2 años de experiencia
- Se requiere certificación vigente
- El presupuesto mínimo es de $5.000..."
              />
              <p className="text-gray-500 text-xs mt-2">
                {knowledgeBase.length} caracteres · ~{Math.ceil(knowledgeBase.length / 4)} tokens
              </p>
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setShowKB(false)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => setShowKB(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

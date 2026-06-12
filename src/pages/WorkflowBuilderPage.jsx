import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import WorkflowBuilder from '../components/builder/WorkflowBuilder'
import { ArrowLeft, Loader2, BookOpen, X, Save } from 'lucide-react'

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
  const [saved, setSaved] = useState(false)

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
    setSaving(true); setSaveError('')
    try {
      const payload = {
        name, knowledgeBase,
        nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null })),
        userId: user.uid,
        updatedAt: serverTimestamp(),
      }
      if (isNew) {
        const ref = doc(collection(db, 'workflows'))
        await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
        navigate(`/workflows/${ref.id}`, { replace: true })
      } else {
        await updateDoc(doc(db, 'workflows', id), payload)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (e) {
      setSaveError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shadow-sm">
        <button onClick={() => navigate('/workflows')} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-transparent text-slate-900 font-semibold text-lg focus:outline-none border-b-2 border-transparent focus:border-blue-800 px-1 transition-colors flex-1 min-w-0"
          placeholder="Nombre del flujo"
        />
        {saveError && <span className="text-red-600 text-xs">{saveError}</span>}
        {saved && <span className="text-emerald-600 text-xs font-medium">Guardado</span>}
        <button
          onClick={() => setShowKB(true)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:block">Base de conocimiento</span>
          {knowledgeBase && <span className="w-2 h-2 bg-blue-800 rounded-full" />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowBuilder workflow={workflow} onSave={handleSave} saving={saving} />
      </div>

      {showKB && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl flex flex-col max-h-[80vh] shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-slate-900 font-semibold">Base de conocimiento</h3>
                <p className="text-slate-500 text-sm mt-0.5">La IA usará este texto para analizar las respuestas de tus clientes.</p>
              </div>
              <button onClick={() => setShowKB(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={knowledgeBase}
                onChange={e => setKnowledgeBase(e.target.value)}
                rows={14}
                className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 resize-none font-mono leading-relaxed placeholder-slate-400"
                placeholder="Pega aquí tu base de conocimiento: criterios de evaluación, requisitos, preguntas frecuentes, políticas, etc."
              />
              <p className="text-slate-400 text-xs mt-2">{knowledgeBase.length} caracteres</p>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowKB(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors font-medium">
                Cancelar
              </button>
              <button onClick={() => setShowKB(false)} className="px-5 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium rounded-xl transition-colors">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

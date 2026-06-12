import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import WorkflowBuilder from '../components/builder/WorkflowBuilder'
import KnowledgeBaseModal from '../components/kb/KnowledgeBaseModal'
import { ArrowLeft, Loader2, BookOpen, Save } from 'lucide-react'

export default function WorkflowBuilderPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState(null)
  const [name, setName] = useState('Flujo sin nombre')
  const [knowledgeBase, setKnowledgeBase] = useState('')
  const [kbFiles, setKbFiles] = useState([])
  const [showKB, setShowKB] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const isNew = id === 'new'
  const [tempWorkflowId] = useState(() => `draft_${Date.now()}`)
  const workflowFolder = isNew ? tempWorkflowId : id

  useEffect(() => {
    if (isNew) { setLoading(false); return }
    getDoc(doc(db, 'workflows', id)).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        setWorkflow(data)
        setName(data.name || 'Flujo sin nombre')
        setKnowledgeBase(data.knowledgeBase || '')
        setKbFiles(data.knowledgeBaseFiles || [])
      }
      setLoading(false)
    })
  }, [id])

  async function handleSave({ nodes, edges }) {
    setSaving(true); setSaveError('')
    try {
      const orgId = user.profile?.orgId || user.uid
      const payload = {
        name, knowledgeBase,
        knowledgeBaseFiles: kbFiles,
        nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null })),
        userId: user.uid,
        orgId,
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

  const hasKB = knowledgeBase.length > 0 || kbFiles.length > 0

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
          {hasKB && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-800 rounded-full" />
              {kbFiles.length > 0 && (
                <span className="text-xs text-blue-800 font-semibold">{kbFiles.length}</span>
              )}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowBuilder workflow={workflow} onSave={handleSave} saving={saving} />
      </div>

      {showKB && (
        <KnowledgeBaseModal
          knowledgeBase={knowledgeBase}
          onChangeKnowledgeBase={setKnowledgeBase}
          kbFiles={kbFiles}
          onAddFile={f => setKbFiles(prev => [...prev, f])}
          onDeleteFile={fid => setKbFiles(prev => prev.filter(f => f.id !== fid))}
          userId={user.uid}
          workflowFolder={workflowFolder}
          onClose={() => setShowKB(false)}
        />
      )}
    </div>
  )
}

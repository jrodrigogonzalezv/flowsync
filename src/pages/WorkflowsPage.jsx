import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { Plus, GitBranch, Loader2, Trash2, UserPlus, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from '../components/utils/date'
import InviteClientModal from '../components/kanban/InviteClientModal'

export default function WorkflowsPage() {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteWorkflow, setInviteWorkflow] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'workflows'), where('userId', '==', user.uid))
    const unsub = onSnapshot(q, snap => {
      setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  async function handleDelete(e, id) {
    e.preventDefault()
    if (!confirm('¿Eliminar este flujo?')) return
    await deleteDoc(doc(db, 'workflows', id))
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Flujos</h2>
          <p className="text-gray-400 text-sm mt-1">Diseña y gestiona tus flujos de proceso.</p>
        </div>
        <Link
          to="/workflows/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:block">Nuevo flujo</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-2xl p-16 text-center">
          <GitBranch className="w-10 h-10 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Sin flujos todavía</h3>
          <p className="text-gray-500 text-sm mb-6">Crea tu primer flujo para empezar.</p>
          <Link
            to="/workflows/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Crear flujo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workflows.map(w => (
            <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors group flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-5 h-5 text-indigo-400" />
                </div>
                <button
                  onClick={e => handleDelete(e, w.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-700 text-gray-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <Link to={`/workflows/${w.id}`} className="flex-1 min-w-0">
                <h3 className="text-white font-medium mb-1 truncate">{w.name || 'Sin nombre'}</h3>
                <p className="text-gray-500 text-xs">
                  {(w.nodes || []).filter(n => n.type !== 'start' && n.type !== 'end').length} pasos
                  {w.updatedAt && ` · ${formatDistanceToNow(w.updatedAt)}`}
                </p>
              </Link>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setInviteWorkflow(w)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs py-2 rounded-xl transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invitar
                </button>
                <Link
                  to={`/workflows/${w.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs py-2 rounded-xl transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {inviteWorkflow && (
        <InviteClientModal
          preselectedWorkflow={inviteWorkflow}
          onClose={() => setInviteWorkflow(null)}
          onCreated={() => {}}
        />
      )}
    </div>
  )
}

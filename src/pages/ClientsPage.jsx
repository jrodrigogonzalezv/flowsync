import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import KanbanBoard from '../components/kanban/KanbanBoard'
import InviteClientModal from '../components/kanban/InviteClientModal'
import { UserPlus, Loader2 } from 'lucide-react'

export default function ClientsPage() {
  const { user } = useAuth()
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selectedExec, setSelectedExec] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'executions'), where('userId', '==', user.uid))
    const unsub = onSnapshot(q, snap => {
      setExecutions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white">Clientes</h2>
          <p className="text-gray-400 text-sm mt-1">
            {executions.length} cliente{executions.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:block">Invitar cliente</span>
          <span className="sm:hidden">Invitar</span>
        </button>
      </div>

      {/* Kanban — full width, scrollable */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8 pb-6">
          <KanbanBoard executions={executions} onCardClick={setSelectedExec} />
        </div>
      )}

      {showInvite && (
        <InviteClientModal
          onClose={() => setShowInvite(false)}
          onCreated={() => setShowInvite(false)}
        />
      )}

      {selectedExec && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedExec(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{selectedExec.clientName}</h3>
            <div className="space-y-3">
              {[
                ['Email', selectedExec.clientEmail],
                ['Flujo', selectedExec.workflowName],
                ['Progreso', `${selectedExec.completedNodes}/${selectedExec.totalNodes} pasos`],
                ['Estado', selectedExec.status?.replace('_', ' ')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedExec(null)}
              className="mt-6 w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

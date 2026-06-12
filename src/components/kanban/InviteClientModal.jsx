import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { X, Copy, Check, Loader2 } from 'lucide-react'

export default function InviteClientModal({ onClose, onCreated, preselectedWorkflow }) {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState(preselectedWorkflow ? [preselectedWorkflow] : [])
  const [form, setForm] = useState({ clientName: '', clientEmail: '', workflowId: preselectedWorkflow?.id || '' })
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (preselectedWorkflow) return
    getDocs(query(collection(db, 'workflows'), where('userId', '==', user.uid)))
      .then(snap => setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  async function handleCreate() {
    if (!form.clientName || !form.clientEmail || !form.workflowId) return
    setLoading(true)
    try {
      const workflow = workflows.find(w => w.id === form.workflowId)
      const ref = doc(collection(db, 'executions'))
      const execution = {
        ...form,
        workflowName: workflow?.name || '',
        userId: user.uid,
        status: 'invited',
        currentNodeIndex: 0,
        completedNodes: 0,
        totalNodes: (workflow?.nodes || []).filter(n => n.type !== 'start' && n.type !== 'end').length,
        responses: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      await setDoc(ref, execution)
      const url = `${window.location.origin}/flow/${ref.id}`
      setLink(url)
      onCreated?.()
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Invitar cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!link ? (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del cliente</label>
                <input
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email del cliente</label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="juan@empresa.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Flujo a asignar</label>
                <select
                  value={form.workflowId}
                  onChange={e => setForm(f => ({ ...f, workflowId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecciona un flujo</option>
                  {workflows.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {workflows.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Primero crea un flujo en la sección Flujos.</p>
                )}
              </div>
              <button
                onClick={handleCreate}
                disabled={loading || !form.clientName || !form.clientEmail || !form.workflowId}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Generar link de invitación
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-white font-medium mb-1">Link generado</p>
              <p className="text-gray-400 text-sm mb-4">Comparte este link con {form.clientName}</p>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 mb-4">
                <span className="text-xs text-gray-300 flex-1 truncate">{link}</span>
                <button onClick={copyLink} className="text-gray-400 hover:text-white flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

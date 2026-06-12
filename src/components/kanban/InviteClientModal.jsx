import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { X, Copy, Check, Loader2, Mail, Link } from 'lucide-react'

export default function InviteClientModal({ onClose, onCreated, preselectedWorkflow }) {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState(preselectedWorkflow ? [preselectedWorkflow] : [])
  const [form, setForm] = useState({ clientName: '', clientEmail: '', workflowId: preselectedWorkflow?.id || '' })
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null)

  useEffect(() => {
    if (preselectedWorkflow) return
    getDocs(query(collection(db, 'workflows'), where('userId', '==', user.uid)))
      .then(snap => setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  async function handleCreate() {
    if (!form.clientName || !form.clientEmail || !form.workflowId) return
    setLoading(true)
    setEmailStatus(null)
    try {
      const workflow = workflows.find(w => w.id === form.workflowId)
      const ref = doc(collection(db, 'executions'))
      await setDoc(ref, {
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
      })
      const generatedLink = `${window.location.origin}/flow/${ref.id}`
      setLink(generatedLink)
      onCreated?.()

      // Try to send email — non-blocking, graceful failure
      try {
        const fns = getFunctions()
        const sendEmail = httpsCallable(fns, 'sendInviteEmail')
        const result = await sendEmail({
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          workflowName: workflow?.name || '',
          flowLink: generatedLink,
          senderName: user.displayName || user.email,
        })
        setEmailStatus(result.data?.sent ? 'sent' : 'not_configured')
      } catch {
        setEmailStatus('error')
      }
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Invitar cliente</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!link ? (
            <>
              {['clientName', 'clientEmail'].map(field => (
                <div key={field}>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    {field === 'clientName' ? 'Nombre del cliente' : 'Email del cliente'}
                  </label>
                  <input
                    type={field === 'clientEmail' ? 'email' : 'text'}
                    placeholder={field === 'clientName' ? 'Juan Pérez' : 'juan@empresa.com'}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Flujo a asignar</label>
                <select
                  value={form.workflowId}
                  onChange={e => setForm(f => ({ ...f, workflowId: e.target.value }))}
                  className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
                >
                  <option value="">Selecciona un flujo</option>
                  {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {!workflows.length && <p className="text-xs text-slate-400 mt-1">Primero crea un flujo.</p>}
              </div>
              <button
                onClick={handleCreate}
                disabled={loading || !form.clientName || !form.clientEmail || !form.workflowId}
                className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando y enviando...</>
                  : <><Mail className="w-4 h-4" /> Invitar y enviar email</>
                }
              </button>
            </>
          ) : (
            <div>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-slate-900 font-semibold mb-1">Invitación creada</p>
                <p className="text-slate-500 text-sm">Link generado para {form.clientName}</p>
              </div>

              {emailStatus === 'sent' && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                  <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-emerald-700 text-sm font-medium">Email enviado a {form.clientEmail}</span>
                </div>
              )}
              {(emailStatus === 'not_configured' || emailStatus === 'error') && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  <Mail className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-700 text-sm font-medium">Email no enviado</p>
                    <p className="text-amber-600 text-xs mt-0.5">Comparte el link manualmente. Para habilitar emails configura GMAIL_USER y GMAIL_PASS en Firebase.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
                <Link className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 flex-1 truncate">{link}</span>
                <button onClick={copyLink} className="text-slate-400 hover:text-slate-700 flex-shrink-0 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

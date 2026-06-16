import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { X, Send, Loader2, CheckCircle, MessageCircle } from 'lucide-react'

export default function OperatorChatPanel({ execution, onClose }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const q = query(
      collection(db, 'executions', execution.id, 'messages'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [execution.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'executions', execution.id, 'messages'), {
        text: text.trim(),
        author: 'operator',
        authorName: user?.displayName || user?.email || 'Agente',
        createdAt: serverTimestamp(),
      })
      setText('')
    } finally { setSending(false) }
  }

  async function resolve() {
    setResolving(true)
    try {
      await updateDoc(doc(db, 'executions', execution.id), {
        humanSupportRequested: false,
        humanSupportResolvedAt: serverTimestamp(),
      })
      onClose()
    } finally { setResolving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl flex flex-col"
        style={{ height: '600px', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-base font-semibold text-slate-900">{execution.clientName}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{execution.clientEmail} · {execution.workflowName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resolve}
              disabled={resolving}
              className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Resolver
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-8 h-8 text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">El cliente ha solicitado ayuda.</p>
              <p className="text-slate-400 text-sm">Escríbele un mensaje para comenzar.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.author === 'operator' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.author === 'operator'
                  ? 'bg-blue-800 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-900 rounded-bl-sm'
              }`}>
                {msg.author === 'client' && (
                  <p className="text-xs font-semibold mb-1 text-blue-700">{msg.authorName}</p>
                )}
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} className="flex gap-2 p-4 border-t border-slate-100 flex-shrink-0">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="flex-1 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

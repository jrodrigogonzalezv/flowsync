import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  doc, getDoc, onSnapshot, updateDoc,
  collection, addDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../lib/firebase'
import FlowStep from '../components/flow/FlowStep'
import {
  Loader2, CheckCircle, AlertCircle, Sparkles, ChevronRight,
  Zap, Send, MessageCircle,
} from 'lucide-react'

export default function ClientFlowPage() {
  const { id } = useParams()
  const [execution, setExecution] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiPhase, setAiPhase] = useState('idle')
  const [aiResult, setAiResult] = useState('')

  // Subscribe to execution in real-time (needed for human escalation).
  // Load workflow once after first execution snapshot.
  useEffect(() => {
    let workflowFetched = false
    const unsub = onSnapshot(
      doc(db, 'executions', id),
      async snap => {
        if (!snap.exists()) { setError('Link inválido o expirado.'); setLoading(false); return }
        setExecution({ id: snap.id, ...snap.data() })
        if (!workflowFetched) {
          workflowFetched = true
          try {
            const wfSnap = await getDoc(doc(db, 'workflows', snap.data().workflowId))
            if (!wfSnap.exists()) { setError('Flujo no encontrado.'); setLoading(false); return }
            setWorkflow({ id: wfSnap.id, ...wfSnap.data() })
          } catch { setError('Error al cargar el flujo.') }
          setLoading(false)
        }
      },
      () => { setError('Error al cargar el flujo.'); setLoading(false) }
    )
    return unsub
  }, [id])

  // Capture UTM / click params on first open and store in execution.
  useEffect(() => {
    if (!execution || execution.utmParams !== undefined) return
    const sp = new URLSearchParams(window.location.search)
    const utmParams = {}
    ;['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid']
      .forEach(k => { if (sp.has(k)) utmParams[k] = sp.get(k) })
    updateDoc(doc(db, 'executions', id), { utmParams }).catch(() => {})
  }, [execution?.id])

  // ── Graph navigation helpers ───────────────────────────────────────────────

  function findNode(nodeId) {
    return (workflow?.nodes || []).find(n => n.id === nodeId) ?? null
  }

  function getNextNode(fromNodeId, sourceHandle) {
    const edges = workflow?.edges || []
    const edge = sourceHandle
      ? edges.find(e => e.source === fromNodeId && e.sourceHandle === sourceHandle)
      : (edges.find(e => e.source === fromNodeId && (e.sourceHandle === 'yes' || !e.sourceHandle || e.sourceHandle === null))
        ?? edges.find(e => e.source === fromNodeId))
    return edge ? findNode(edge.target) : null
  }

  // Legacy linear path — used as fallback for executions without currentNodeId.
  function getSteps() {
    if (!workflow) return []
    const nodes = workflow.nodes || []
    const edges = workflow.edges || []
    const ordered = []
    let current = nodes.find(n => n.type === 'start')
    const visited = new Set()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      if (current.type !== 'start' && current.type !== 'end') ordered.push(current)
      const nextEdge = edges.find(e => e.source === current.id && (e.sourceHandle === 'yes' || !e.sourceHandle || e.sourceHandle === null))
        ?? edges.find(e => e.source === current.id)
      current = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null
    }
    return ordered
  }

  const currentNode = (() => {
    if (!execution || !workflow) return null
    if (execution.currentNodeId) return findNode(execution.currentNodeId)
    return getSteps()[execution.currentNodeIndex ?? 0] ?? null
  })()

  const isCompleted = execution?.status === 'completed'
  const needsSupport = !!execution?.humanSupportRequested && !isCompleted

  // Reset AI phase when the active node changes.
  const activeNodeKey = execution?.currentNodeId ?? execution?.currentNodeIndex
  useEffect(() => { setAiPhase('idle'); setAiResult('') }, [activeNodeKey])

  // ── Navigation handlers ────────────────────────────────────────────────────

  async function handleDecision(option) {
    const nextNode = getNextNode(currentNode.id, option.id)
    const isEnd = !nextNode || nextNode.type === 'end'
    const newCompleted = (execution.completedNodes || 0) + 1
    const historyEntry = {
      nodeId: currentNode.id,
      nodeType: 'decision',
      label: currentNode.data?.label || 'Decisión',
      chosenOptionId: option.id,
      chosenOptionLabel: option.label,
      nextNodeId: nextNode?.id ?? null,
      at: new Date().toISOString(),
    }
    await updateDoc(doc(db, 'executions', id), {
      responses: { ...(execution.responses || {}), [currentNode.id]: { chosenOptionId: option.id, chosenOptionLabel: option.label } },
      currentNodeId: isEnd ? null : nextNode.id,
      currentNodeIndex: (execution.currentNodeIndex ?? 0) + 1,
      completedNodes: newCompleted,
      status: isEnd ? 'completed' : 'in_progress',
      navigationHistory: [...(execution.navigationHistory || []), historyEntry],
      updatedAt: serverTimestamp(),
    })
  }

  async function handleSubmit(responses) {
    if (currentNode.type === 'ai' && aiPhase === 'idle') {
      setAiPhase('analyzing')
      try {
        const fns = getFunctions()
        const analyzeFlow = httpsCallable(fns, 'analyzeFlow')
        const result = await analyzeFlow({
          responses: execution.responses || {},
          aiPrompt: currentNode.data.aiPrompt || 'Analiza las respuestas del cliente.',
          knowledgeBase: [
            workflow.knowledgeBase || '',
            ...(workflow.knowledgeBaseFiles || []).map(f => f.extractedText || ''),
          ].filter(Boolean).join('\n\n---\n\n'),
        })
        setAiResult(result.data.result)
        setAiPhase('result')
      } catch {
        setAiResult('No se pudo completar el análisis. Puedes continuar al siguiente paso.')
        setAiPhase('result')
      }
      return
    }

    setSubmitting(true)
    try {
      const stepResponses = currentNode.type === 'ai' ? { aiResult } : responses
      const nextNode = getNextNode(currentNode.id)
      const isEnd = !nextNode || nextNode.type === 'end'
      const newCompleted = (execution.completedNodes || 0) + 1
      const historyEntry = {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label: currentNode.data?.label || '',
        nextNodeId: nextNode?.id ?? null,
        at: new Date().toISOString(),
      }
      await updateDoc(doc(db, 'executions', id), {
        responses: { ...(execution.responses || {}), [currentNode.id]: stepResponses },
        currentNodeId: isEnd ? null : nextNode.id,
        currentNodeIndex: (execution.currentNodeIndex ?? 0) + 1,
        completedNodes: newCompleted,
        status: isEnd ? 'completed' : 'in_progress',
        navigationHistory: [...(execution.navigationHistory || []), historyEntry],
        updatedAt: serverTimestamp(),
      })
    } finally { setSubmitting(false) }
  }

  async function handleRequestSupport() {
    await updateDoc(doc(db, 'executions', id), {
      humanSupportRequested: true,
      humanSupportRequestedAt: serverTimestamp(),
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  if (error) return <RecoverLinkScreen />

  const progress = isCompleted ? 100
    : execution?.totalNodes > 0 ? ((execution?.completedNodes || 0) / execution.totalNodes) * 100
    : 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-sm leading-none">{workflow?.name}</p>
              <p className="text-slate-500 text-xs mt-0.5">Hola, {execution?.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              {isCompleted ? '✓ Completado' : `${(execution?.completedNodes || 0) + 1} / ${execution?.totalNodes || '?'}`}
            </span>
            {!isCompleted && !needsSupport && (
              <button
                onClick={handleRequestSupport}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-800 border border-slate-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Necesito ayuda</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-blue-800 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="w-full max-w-xl mx-auto">
          {isCompleted
            ? <CompletedScreen name={execution?.clientName} />
            : needsSupport
            ? <ClientChatScreen executionId={id} clientName={execution?.clientName} />
            : aiPhase === 'analyzing'
            ? <AnalyzingScreen />
            : aiPhase === 'result'
            ? <AiResultScreen
                result={aiResult}
                stepNumber={(execution?.completedNodes || 0) + 1}
                totalSteps={execution?.totalNodes || 0}
                submitting={submitting}
                onContinue={() => handleSubmit({})}
              />
            : currentNode?.type === 'condition'
            ? <ConditionStep node={currentNode} onChoose={handleDecision} />
            : currentNode?.type === 'decision'
            ? <DecisionStep node={currentNode} onChoose={handleDecision} />
            : currentNode
            ? <FlowStep
                step={currentNode}
                stepNumber={(execution?.completedNodes || 0) + 1}
                totalSteps={execution?.totalNodes || 0}
                previousResponses={execution?.responses || {}}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            : <div className="text-center text-slate-400 py-20">Este flujo no tiene pasos configurados.</div>
          }
        </div>
      </div>
    </div>
  )
}

// ── ConditionStep ────────────────────────────────────────────────────────────

function ConditionStep({ node, onChoose }) {
  const [chosen, setChosen] = useState(null)

  async function pick(handle, label) {
    if (chosen) return
    setChosen(handle)
    await onChoose({ id: handle, label })
  }

  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-6">
        <span className="text-amber-600 text-sm">◆</span>
        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Condición</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">{node.data?.label || 'Condición'}</h2>
      {node.data?.condition && (
        <p className="text-slate-500 text-base mb-8 leading-relaxed">{node.data.condition}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => pick('yes', 'Sí')}
          disabled={!!chosen}
          className={`flex-1 py-4 rounded-xl border-2 font-semibold text-base transition-all
            ${chosen === 'yes'
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
              : chosen
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500 cursor-pointer'
            }`}
        >
          ✓ Sí
        </button>
        <button
          onClick={() => pick('no', 'No')}
          disabled={!!chosen}
          className={`flex-1 py-4 rounded-xl border-2 font-semibold text-base transition-all
            ${chosen === 'no'
              ? 'border-rose-600 bg-rose-600 text-white shadow-md'
              : chosen
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
              : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-500 cursor-pointer'
            }`}
        >
          ✗ No
        </button>
      </div>
    </div>
  )
}

// ── DecisionStep ──────────────────────────────────────────────────────────────

function DecisionStep({ node, onChoose }) {
  const [chosen, setChosen] = useState(null)

  async function pick(option) {
    if (chosen) return
    setChosen(option.id)
    await onChoose(option)
  }

  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 mb-6">
        <span className="text-indigo-600 text-sm">🔀</span>
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Decisión</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">{node.data?.label || 'Elige una opción'}</h2>
      {node.data?.description && (
        <p className="text-slate-500 text-base mb-8 leading-relaxed">{node.data.description}</p>
      )}
      <div className="flex flex-col gap-3">
        {(node.data?.options || []).map((option, i) => (
          <button
            key={option.id}
            onClick={() => pick(option)}
            disabled={!!chosen}
            className={`w-full text-left px-6 py-4 rounded-xl border-2 font-medium text-base transition-all
              ${chosen === option.id
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                : chosen
                ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer shadow-sm hover:shadow-md'
              }`}
          >
            {option.label || `Opción ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── ClientChatScreen ──────────────────────────────────────────────────────────

function ClientChatScreen({ executionId, clientName }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const q = query(
      collection(db, 'executions', executionId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [executionId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'executions', executionId, 'messages'), {
        text: text.trim(),
        author: 'client',
        authorName: clientName || 'Cliente',
        createdAt: serverTimestamp(),
      })
      setText('')
    } finally { setSending(false) }
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <MessageCircle className="w-6 h-6 text-blue-800" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Chat con soporte</h2>
        <p className="text-slate-500 text-sm">Un agente se conectará contigo en breve.</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 overflow-y-auto min-h-[300px] max-h-[420px]">
        {messages.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-10">Esperando al agente...</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.author === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.author === 'client'
                ? 'bg-blue-800 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-900 rounded-bl-sm'
            }`}>
              {msg.author !== 'client' && (
                <p className="text-xs font-semibold mb-1 text-blue-700">{msg.authorName}</p>
              )}
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 mt-3">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe tu mensaje..."
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
  )
}

// ── Sub-screens ───────────────────────────────────────────────────────────────

function AnalyzingScreen() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-violet-50 border-2 border-violet-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Analizando tus respuestas</h2>
      <p className="text-slate-500 text-sm">La IA está procesando tu información. Un momento...</p>
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  )
}

function AiResultScreen({ result, stepNumber, totalSteps, submitting, onContinue }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 mb-6">
        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">Análisis IA · {stepNumber}/{totalSteps}</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Resultados del análisis</h2>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
        {result.split('\n').map((line, i) => (
          line.trim() ? <p key={i} className="text-slate-700 leading-relaxed mb-3 last:mb-0">{line}</p> : <br key={i} />
        ))}
      </div>
      <button onClick={onContinue} disabled={submitting}
        className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-sm">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <>{stepNumber === totalSteps ? 'Finalizar' : 'Continuar'} <ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  )
}

function RecoverLinkScreen() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  async function handleRecover(e) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const fns = getFunctions()
      const resend = httpsCallable(fns, 'resendFlowLink')
      await resend({ email })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Link no encontrado</h2>
        <p className="text-slate-500 text-sm mb-6">Este link no es válido o ya expiró. Si tienes un proceso pendiente, ingresa tu email y te reenviaremos el acceso.</p>
        {status === 'sent' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-emerald-700 text-sm font-medium">¡Listo! Revisa tu email, te enviamos los links de tus procesos pendientes.</p>
          </div>
        ) : (
          <form onSubmit={handleRecover} className="space-y-3">
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
            />
            {status === 'error' && <p className="text-xs text-red-600">Error al enviar. Intenta de nuevo.</p>}
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Reenviar mis links</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function CompletedScreen({ name }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Todo listo, {name}!</h2>
      <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
        Has completado todos los pasos del proceso. Nos pondremos en contacto contigo pronto.
      </p>
    </div>
  )
}

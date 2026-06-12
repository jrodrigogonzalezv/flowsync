import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../lib/firebase'
import FlowStep from '../components/flow/FlowStep'
import { Loader2, CheckCircle, AlertCircle, Sparkles, ChevronRight, Zap, Mail, Send } from 'lucide-react'

export default function ClientFlowPage() {
  const { id } = useParams()
  const [execution, setExecution] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiPhase, setAiPhase] = useState('idle')
  const [aiResult, setAiResult] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const execSnap = await getDoc(doc(db, 'executions', id))
        if (!execSnap.exists()) { setError('Link inválido o expirado.'); setLoading(false); return }
        const exec = { id: execSnap.id, ...execSnap.data() }
        setExecution(exec)
        const wfSnap = await getDoc(doc(db, 'workflows', exec.workflowId))
        if (!wfSnap.exists()) { setError('Flujo no encontrado.'); setLoading(false); return }
        setWorkflow({ id: wfSnap.id, ...wfSnap.data() })
      } catch { setError('Error al cargar el flujo.') }
      setLoading(false)
    }
    load()
  }, [id])

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
      const nextEdge = edges.find(e => e.source === current.id && (e.sourceHandle === 'yes' || !e.sourceHandle || e.sourceHandle === null)) || edges.find(e => e.source === current.id)
      current = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null
    }
    return ordered
  }

  const steps = getSteps()
  const currentStepIndex = execution?.currentNodeIndex ?? 0
  const currentStep = steps[currentStepIndex]
  const isCompleted = execution?.status === 'completed'

  useEffect(() => { setAiPhase('idle'); setAiResult('') }, [currentStepIndex])

  async function handleSubmit(responses) {
    if (currentStep.type === 'ai' && aiPhase === 'idle') {
      setAiPhase('analyzing')
      try {
        const fns = getFunctions()
        const analyzeFlow = httpsCallable(fns, 'analyzeFlow')
        const result = await analyzeFlow({
          responses: execution.responses || {},
          aiPrompt: currentStep.data.aiPrompt || 'Analiza las respuestas del cliente.',
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
      const stepResponses = currentStep.type === 'ai' ? { aiResult } : responses
      const nextIndex = currentStepIndex + 1
      const isLast = nextIndex >= steps.length
      const allResponses = { ...(execution.responses || {}), [currentStep.id]: stepResponses }
      await updateDoc(doc(db, 'executions', id), {
        responses: allResponses, currentNodeIndex: nextIndex, completedNodes: nextIndex,
        status: isLast ? 'completed' : 'in_progress', updatedAt: serverTimestamp(),
      })
      setExecution(prev => ({ ...prev, responses: allResponses, currentNodeIndex: nextIndex, completedNodes: nextIndex, status: isLast ? 'completed' : 'in_progress' }))
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  if (error) return <RecoverLinkScreen />


  const progress = isCompleted ? 100 : steps.length > 0 ? (currentStepIndex / steps.length) * 100 : 0

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
            <div className="hidden sm:flex items-center gap-2">
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                  i < currentStepIndex || isCompleted ? 'bg-blue-800' : i === currentStepIndex ? 'bg-blue-400 ring-2 ring-blue-200' : 'bg-slate-200'
                }`} />
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {isCompleted ? '✓ Completado' : `${Math.min(currentStepIndex + 1, steps.length)} / ${steps.length}`}
            </span>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-blue-800 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="w-full max-w-xl mx-auto">
          {isCompleted ? <CompletedScreen name={execution?.clientName} />
            : aiPhase === 'analyzing' ? <AnalyzingScreen />
            : aiPhase === 'result' ? <AiResultScreen result={aiResult} stepNumber={currentStepIndex + 1} totalSteps={steps.length} submitting={submitting} onContinue={() => handleSubmit({})} />
            : currentStep ? <FlowStep step={currentStep} stepNumber={currentStepIndex + 1} totalSteps={steps.length} previousResponses={execution?.responses || {}} submitting={submitting} onSubmit={handleSubmit} />
            : <div className="text-center text-slate-400 py-20">Este flujo no tiene pasos configurados.</div>
          }
        </div>
      </div>
    </div>
  )
}

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

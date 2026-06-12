import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../lib/firebase'
import FlowStep from '../components/flow/FlowStep'
import { Loader2, CheckCircle, AlertCircle, Sparkles, ChevronRight } from 'lucide-react'

export default function ClientFlowPage() {
  const { id } = useParams()
  const [execution, setExecution] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Para nodos IA: 'idle' | 'analyzing' | 'result'
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
      } catch {
        setError('Error al cargar el flujo.')
      }
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
      const nextEdge = edges.find(e => e.source === current.id &&
        (e.sourceHandle === 'yes' || !e.sourceHandle || e.sourceHandle === null))
        || edges.find(e => e.source === current.id)
      current = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null
    }
    return ordered
  }

  const steps = getSteps()
  const currentStepIndex = execution?.currentNodeIndex ?? 0
  const currentStep = steps[currentStepIndex]
  const isCompleted = execution?.status === 'completed'

  // Reset ai phase when step changes
  useEffect(() => {
    setAiPhase('idle')
    setAiResult('')
  }, [currentStepIndex])

  async function handleSubmit(responses) {
    // Nodo IA — fase 1: analizar
    if (currentStep.type === 'ai' && aiPhase === 'idle') {
      setAiPhase('analyzing')
      try {
        const fns = getFunctions()
        const analyzeFlow = httpsCallable(fns, 'analyzeFlow')
        const result = await analyzeFlow({
          responses: execution.responses || {},
          aiPrompt: currentStep.data.aiPrompt || 'Analiza las respuestas del cliente.',
          knowledgeBase: workflow.knowledgeBase || '',
        })
        setAiResult(result.data.result)
        setAiPhase('result')
      } catch {
        setAiResult('No se pudo completar el análisis. Puedes continuar al siguiente paso.')
        setAiPhase('result')
      }
      return
    }

    // Nodo IA — fase 2: guardar resultado y avanzar
    // Cualquier otro nodo: guardar respuestas y avanzar
    setSubmitting(true)
    try {
      const stepResponses = currentStep.type === 'ai' ? { aiResult } : responses
      const nextIndex = currentStepIndex + 1
      const isLast = nextIndex >= steps.length
      const allResponses = { ...(execution.responses || {}), [currentStep.id]: stepResponses }

      await updateDoc(doc(db, 'executions', id), {
        responses: allResponses,
        currentNodeIndex: nextIndex,
        completedNodes: nextIndex,
        status: isLast ? 'completed' : 'in_progress',
        updatedAt: serverTimestamp(),
      })

      setExecution(prev => ({
        ...prev,
        responses: allResponses,
        currentNodeIndex: nextIndex,
        completedNodes: nextIndex,
        status: isLast ? 'completed' : 'in_progress',
      }))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-white font-medium">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm leading-none">{workflow?.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">Hola, {execution?.clientName}</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {isCompleted ? '✓ Completado' : `${Math.min(currentStepIndex + 1, steps.length)} / ${steps.length}`}
          </span>
        </div>
        {steps.length > 0 && (
          <div className="h-0.5 bg-gray-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${isCompleted ? 100 : (currentStepIndex / steps.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="w-full max-w-xl mx-auto">
          {isCompleted ? (
            <CompletedScreen name={execution?.clientName} />
          ) : aiPhase === 'analyzing' ? (
            <AnalyzingScreen />
          ) : aiPhase === 'result' ? (
            <AiResultScreen
              result={aiResult}
              stepNumber={currentStepIndex + 1}
              totalSteps={steps.length}
              submitting={submitting}
              onContinue={() => handleSubmit({})}
            />
          ) : currentStep ? (
            <FlowStep
              step={currentStep}
              stepNumber={currentStepIndex + 1}
              totalSteps={steps.length}
              previousResponses={execution?.responses || {}}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="text-center text-gray-400 py-20">Este flujo no tiene pasos configurados.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function AnalyzingScreen() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Analizando tus respuestas</h2>
      <p className="text-gray-400 text-sm">La IA está procesando tu información. Un momento...</p>
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function AiResultScreen({ result, stepNumber, totalSteps, submitting, onContinue }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Análisis IA · {stepNumber}/{totalSteps}
        </span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6">Resultados del análisis</h2>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8">
        <div className="prose prose-invert prose-sm max-w-none">
          {result.split('\n').map((line, i) => (
            line.trim() ? (
              <p key={i} className="text-gray-200 leading-relaxed mb-3 last:mb-0">{line}</p>
            ) : <br key={i} />
          ))}
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={submitting}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-8 py-3 rounded-xl transition-colors"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
          : <>{stepNumber === totalSteps ? 'Finalizar' : 'Continuar'} <ChevronRight className="w-4 h-4" /></>
        }
      </button>
    </div>
  )
}

function CompletedScreen({ name }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">¡Todo listo, {name}!</h2>
      <p className="text-gray-400 max-w-sm mx-auto">
        Has completado todos los pasos. Te contactaremos pronto con los próximos pasos.
      </p>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db, isSignInWithEmailLink, signInWithEmailLink } from '../lib/firebase'
import { Zap, Loader2, ChevronRight, CheckCircle, Clock, FileText, AlertCircle, X } from 'lucide-react'

export default function ClientPortalPage() {
  const [clientUser, setClientUser] = useState(undefined) // undefined = loading
  const [executions, setExecutions] = useState([])
  const [error, setError] = useState('')
  const [completingSignIn, setCompletingSignIn] = useState(
    isSignInWithEmailLink(auth, window.location.href)
  )

  // Complete magic link sign-in if URL contains one
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return
    let email = localStorage.getItem('flowsync_client_email')
    if (!email) email = window.prompt('Por seguridad, ingresa tu email para confirmar el acceso:')
    if (!email) { setCompletingSignIn(false); return }
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        localStorage.removeItem('flowsync_client_email')
        window.history.replaceState(null, '', '/portal')
      })
      .catch(() => {
        setError('El link de acceso no es válido o ya expiró. Solicita uno nuevo desde el formulario del proceso.')
        setCompletingSignIn(false)
      })
  }, [])

  // Track Firebase Auth state
  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      setClientUser(user)
      if (user) {
        try {
          const q = query(collection(db, 'executions'), where('clientEmail', '==', user.email))
          const snap = await getDocs(q)
          const execs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          execs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setExecutions(execs)
        } catch {
          setError('Error al cargar tus procesos.')
        }
      }
      setCompletingSignIn(false)
    })
  }, [])

  const isLoading = clientUser === undefined || completingSignIn

  const statusConfig = {
    invited:     { label: 'Pendiente',      cls: 'text-amber-600 bg-amber-50 border-amber-200' },
    in_progress: { label: 'En progreso',    cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    review:      { label: 'En revisión',    cls: 'text-purple-700 bg-purple-50 border-purple-200' },
    completed:   { label: 'Completado',     cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    archived:    { label: 'Archivado',      cls: 'text-slate-500 bg-slate-50 border-slate-200' },
  }

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  if (!clientUser) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Zap className="w-7 h-7 text-blue-800" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Portal de clientes</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">
          Para acceder, usa el link que recibiste por email al crear tu cuenta.
        </p>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">Mis procesos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 truncate max-w-[160px] hidden sm:block">{clientUser.email}</span>
            <button
              onClick={() => auth.signOut().then(() => setClientUser(null))}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Hola</h1>
        <p className="text-slate-500 text-sm mb-8">Aquí están todos tus procesos asignados.</p>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {executions.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No tienes procesos asignados aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map(exec => {
              const st = statusConfig[exec.status] || statusConfig.invited
              const progress = exec.totalNodes > 0
                ? Math.round((exec.completedNodes || 0) / exec.totalNodes * 100)
                : 0
              return (
                <Link
                  key={exec.id}
                  to={`/flow/${exec.id}`}
                  className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{exec.workflowName || 'Proceso'}</p>
                      {exec.totalNodes > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {exec.completedNodes || 0} de {exec.totalNodes} pasos completados
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>

                  {exec.totalNodes > 0 && exec.status !== 'completed' && (
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-800 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  {exec.status === 'completed' && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600">Proceso completado</span>
                    </div>
                  )}
                  {exec.status === 'review' && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600">Documentos en revisión</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

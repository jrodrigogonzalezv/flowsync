import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Zap, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react'

export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, claimInvite, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth()
  const inviteId = searchParams.get('invite')

  const [invite, setInvite] = useState(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading2, setAuthLoading2] = useState(false)

  useEffect(() => {
    if (!inviteId) { setInviteError('Link de invitación inválido.'); setLoadingInvite(false); return }
    getDoc(doc(db, 'invites', inviteId)).then(snap => {
      if (!snap.exists()) { setInviteError('Invitación no encontrada o expirada.'); setLoadingInvite(false); return }
      const data = snap.data()
      if (data.claimed) { setInviteError('Esta invitación ya fue utilizada.'); setLoadingInvite(false); return }
      if (data.expiresAt?.toDate() < new Date()) { setInviteError('Esta invitación ha expirado.'); setLoadingInvite(false); return }
      setInvite(data)
      setLoadingInvite(false)
    })
  }, [inviteId])

  useEffect(() => {
    if (user && invite && !joined && !joining) handleJoin()
  }, [user, invite])

  async function handleJoin() {
    setJoining(true)
    try {
      await claimInvite(inviteId)
      setJoined(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (e) {
      setInviteError(e.message)
    } finally {
      setJoining(false)
    }
  }

  async function handleAuth(e) {
    e.preventDefault()
    setAuthError(''); setAuthLoading2(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(form.email, form.password)
      } else {
        await registerWithEmail(form.email, form.password, form.name)
      }
    } catch (e) {
      setAuthError(e.message?.replace('Firebase: ', '') || 'Error de autenticación')
    } finally {
      setAuthLoading2(false)
    }
  }

  async function handleGoogle() {
    setAuthError(''); setAuthLoading2(true)
    try { await loginWithGoogle() } catch (e) { setAuthError(e.message) } finally { setAuthLoading2(false) }
  }

  if (loadingInvite || authLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-xl tracking-tight">FlowSync</span>
          </div>
        </div>

        {inviteError ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invitación inválida</h2>
            <p className="text-slate-500 text-sm">{inviteError}</p>
          </div>
        ) : joined ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Bienvenido al equipo!</h2>
            <p className="text-slate-500 text-sm">Redirigiendo al dashboard...</p>
          </div>
        ) : joining ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <Loader2 className="w-12 h-12 text-blue-800 mx-auto mb-4 animate-spin" />
            <p className="text-slate-500 text-sm">Uniéndote a la organización...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-blue-800 px-6 py-5 text-center">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white font-bold text-lg">Te invitaron a FlowSync</h2>
              <p className="text-blue-200 text-sm mt-1">
                {invite?.createdByName} te invita como <strong className="text-white">{invite?.role === 'admin' ? 'Admin' : 'Supervisor'}</strong>
              </p>
            </div>

            <div className="p-6">
              {!user ? (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={authLoading2}
                    className="w-full flex items-center justify-center gap-3 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors mb-4"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continuar con Google
                  </button>

                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">o con email</span></div>
                  </div>

                  <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
                    {['login', 'register'].map(m => (
                      <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                        {m === 'login' ? 'Ya tengo cuenta' : 'Crear cuenta'}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAuth} className="space-y-3">
                    {mode === 'register' && (
                      <input
                        placeholder="Tu nombre"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                      />
                    )}
                    <input
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                    />
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                    />
                    {authError && <p className="text-xs text-red-600">{authError}</p>}
                    <button
                      type="submit"
                      disabled={authLoading2}
                      className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {authLoading2 ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'login' ? 'Entrar y unirme' : 'Crear cuenta y unirme')}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-600 text-sm mb-4">Sesión activa como <strong>{user.email}</strong></p>
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {joining ? <><Loader2 className="w-4 h-4 animate-spin" /> Uniéndome...</> : 'Unirme al equipo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

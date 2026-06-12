import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { UserPlus, Trash2, Loader2, Shield, Clock, Copy, Check, X, Mail } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Acceso total: crear flujos, ver todo, gestionar equipo' },
  { value: 'supervisor', label: 'Supervisor', description: 'Ver Kanban, respuestas de clientes e invitar clientes' },
]

function RoleBadge({ role }) {
  if (role === 'admin') return (
    <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
      <Shield className="w-3 h-3" /> Admin
    </span>
  )
  return (
    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">Supervisor</span>
  )
}

export default function TeamPage() {
  const { user } = useAuth()
  const orgId = user?.profile?.orgId
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const qMembers = query(collection(db, 'users'), where('orgId', '==', orgId))
    const unsubM = onSnapshot(qMembers, snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    const qInvites = query(collection(db, 'invites'), where('orgId', '==', orgId), where('claimed', '==', false))
    const unsubI = onSnapshot(qInvites, snap => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.expiresAt?.toDate() > new Date()))
    })
    return () => { unsubM(); unsubI() }
  }, [orgId])

  async function handleRemoveMember(memberId) {
    if (memberId === user.uid) return
    if (!confirm('¿Eliminar a este miembro del equipo?')) return
    await deleteDoc(doc(db, 'users', memberId))
  }

  async function handleRevokeInvite(inviteId) {
    await deleteDoc(doc(db, 'invites', inviteId))
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipo</h2>
          <p className="text-slate-500 text-sm mt-1">{members.length} miembro{members.length !== 1 ? 's' : ''} en tu organización</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:block">Invitar miembro</span>
          <span className="sm:hidden">Invitar</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-800 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Miembros activos</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-blue-800 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                    {m.displayName?.[0] || m.email?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.displayName || m.email}</p>
                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                  {m.id !== user.uid && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {m.id === user.uid && (
                    <span className="text-xs text-slate-400 pl-6">Tú</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {invites.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Invitaciones pendientes</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{inv.email}</p>
                      <p className="text-xs text-slate-400">Invitado como {inv.role === 'admin' ? 'Admin' : 'Supervisor'}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <InviteMemberModal
          orgId={orgId}
          currentUser={user}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function InviteMemberModal({ orgId, currentUser, onClose }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('supervisor')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!email) return
    setLoading(true); setError('')
    try {
      const inviteRef = doc(collection(db, 'invites'))
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      await setDoc(inviteRef, {
        email,
        orgId,
        role,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email,
        claimed: false,
        expiresAt,
        createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}/join?invite=${inviteRef.id}`
      setInviteLink(link)

      try {
        const fns = getFunctions()
        const sendInvite = httpsCallable(fns, 'sendTeamInvite')
        const result = await sendInvite({
          email,
          role,
          inviteLink: link,
          senderName: currentUser.displayName || currentUser.email,
        })
        setEmailStatus(result.data?.sent ? 'sent' : 'not_configured')
      } catch {
        setEmailStatus('error')
      }
    } catch (e) {
      setError(e.message || 'Error al crear la invitación')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Invitar miembro</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!inviteLink ? (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="colaborador@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 placeholder-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Rol</label>
                <div className="space-y-2">
                  {ROLES.map(r => (
                    <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      role === r.value ? 'border-blue-800 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="mt-0.5 accent-blue-800" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={handleInvite}
                disabled={loading || !email}
                className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando invitación...</>
                  : <><Mail className="w-4 h-4" /> Enviar invitación</>
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
                <p className="text-slate-500 text-sm">Válida por 7 días para {email}</p>
              </div>

              {emailStatus === 'sent' && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                  <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-emerald-700 text-sm font-medium">Email enviado a {email}</span>
                </div>
              )}
              {(emailStatus === 'not_configured' || emailStatus === 'error') && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  <Mail className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-sm">Email no enviado — comparte el link manualmente.</p>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
                <span className="text-xs text-slate-700 flex-1 truncate">{inviteLink}</span>
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

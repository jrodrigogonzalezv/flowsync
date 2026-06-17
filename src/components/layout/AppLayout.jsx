import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, GitBranch, Users, LogOut, Menu, X, Zap,
  UsersRound, Shield, Bell, BarChart2, Settings, UserCircle, CheckCheck,
} from 'lucide-react'

const adminNav = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/dashboard' },
  { icon: GitBranch,       label: 'Flujos',     to: '/workflows' },
  { icon: Users,           label: 'Clientes',   to: '/clients' },
  { icon: BarChart2,       label: 'Analytics',  to: '/analytics' },
  { icon: UsersRound,      label: 'Equipo',     to: '/team' },
]

const supervisorNav = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: Users,           label: 'Clientes',  to: '/clients' },
]

const NOTIF_ICONS = {
  flow_completed:    { icon: '✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  support_requested: { icon: '💬', bg: 'bg-amber-100', text: 'text-amber-700' },
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifsRef = useRef()
  const userMenuRef = useRef()

  const role = user?.profile?.role || 'supervisor'
  const navItems = role === 'admin' ? adminNav : supervisorNav
  const orgId = user?.profile?.orgId || user?.uid

  // Unread notifications
  useEffect(() => {
    if (!orgId) return
    const q = query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    return onSnapshot(q, snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})
  }, [orgId])

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e) {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function markRead(notifId) {
    await updateDoc(doc(db, 'notifications', notifId), { read: true })
  }

  async function markAllRead() {
    const batch = writeBatch(db)
    notifications.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
    setShowNotifs(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const avatar = user?.photoURL
    ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200" />
    : <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-sm font-semibold text-white select-none">
        {user?.displayName?.[0] || user?.email?.[0] || '?'}
      </div>

  const roleBadge = role === 'admin'
    ? <span className="hidden sm:flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium"><Shield className="w-3 h-3" /> Admin</span>
    : <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">Supervisor</span>

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block tracking-tight">FlowSync</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map(({ icon: Icon, label, to }) => {
              const active = location.pathname.startsWith(to)
              return (
                <Link key={to} to={to} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {roleBadge}

            {/* Notification bell */}
            <div className="relative" ref={notifsRef}>
              <button
                onClick={() => { setShowNotifs(v => !v); setShowUserMenu(false) }}
                className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-blue-800 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
                    {notifications.length > 0 && (
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900 font-medium">
                        <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Sin notificaciones nuevas</p>
                      </div>
                    ) : (
                      notifications.map(n => {
                        const meta = NOTIF_ICONS[n.type] || NOTIF_ICONS.flow_completed
                        const msg = n.type === 'support_requested'
                          ? `${n.clientName} solicita soporte`
                          : `${n.clientName} completó ${n.workflowName}`
                        return (
                          <button
                            key={n.id}
                            onClick={() => { markRead(n.id); navigate('/clients'); setShowNotifs(false) }}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 text-sm mt-0.5`}>
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 font-medium leading-snug">{msg}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{n.workflowName}</p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                onClick={() => { setShowUserMenu(v => !v); setShowNotifs(false) }}
                className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {avatar}
                <span className="text-sm text-slate-700 font-medium max-w-[120px] truncate hidden lg:block">
                  {user?.displayName || user?.email}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName || 'Usuario'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link to="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <UserCircle className="w-4 h-4 text-slate-400" /> Mi perfil
                    </Link>
                    {role === 'admin' && (
                      <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Settings className="w-4 h-4 text-slate-400" /> Configuración
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-slate-500 hover:text-slate-900 p-1"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {navItems.map(({ icon: Icon, label, to }) => {
              const active = location.pathname.startsWith(to)
              return (
                <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              )
            })}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 font-medium">
                <UserCircle className="w-4 h-4" /> Mi perfil
              </Link>
              {role === 'admin' && (
                <Link to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 font-medium">
                  <Settings className="w-4 h-4" /> Configuración
                </Link>
              )}
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">{avatar}
                <span className="text-sm text-slate-700 font-medium truncate max-w-[160px]">
                  {user?.displayName || user?.email}
                </span>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  )
}

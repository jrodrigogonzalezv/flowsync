import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Zap, Shield, Building2, LogOut, Search, Settings, LayoutDashboard } from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       to: '/superadmin/dashboard', exact: true },
  { icon: Building2,       label: 'Organizaciones',  to: '/superadmin/orgs',      exact: false },
  { icon: Search,          label: 'Buscar',          to: '/superadmin/search',    exact: false },
  { icon: Settings,        label: 'Configuración',   to: '/superadmin/settings',  exact: false },
]

export default function SuperAdminLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const avatar = user?.photoURL
    ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-200" />
    : <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-semibold text-white select-none">
        {user?.displayName?.[0] || user?.email?.[0] || '?'}
      </div>

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-purple-100 bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-6">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-purple-700 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight hidden sm:block">FlowSync</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> Super Admin
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ icon: Icon, label, to, exact }) => {
              const active = exact
                ? location.pathname === to
                : location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-purple-50 text-purple-800'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              )
            })}
          </nav>

          {/* User menu */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {avatar}
              <span className="text-sm text-slate-700 font-medium max-w-[140px] truncate hidden sm:block">
                {user?.displayName || user?.email}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName || 'Super Admin'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, to, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-purple-50 text-purple-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </Link>
            )
          })}
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  )
}

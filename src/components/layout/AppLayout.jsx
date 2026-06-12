import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, GitBranch, Users, Settings, LogOut, Menu, X, Zap } from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: GitBranch,       label: 'Flujos',     to: '/workflows' },
  { icon: Users,           label: 'Clientes',   to: '/clients' },
  { icon: Settings,        label: 'Config',     to: '/settings' },
]

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const avatar = user?.photoURL
    ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold text-white">
        {user?.displayName?.[0] || user?.email?.[0] || '?'}
      </div>

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-6">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">FlowSync</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map(({ icon: Icon, label, to }) => {
              const active = location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600/20 text-indigo-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {avatar}
              <span className="text-sm text-gray-300 max-w-[140px] truncate">
                {user?.displayName || user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-gray-400 hover:text-white p-1"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-3 space-y-1">
            {navItems.map(({ icon: Icon, label, to }) => {
              const active = location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {avatar}
                <span className="text-sm text-gray-300 truncate max-w-[180px]">
                  {user?.displayName || user?.email}
                </span>
              </div>
              <button onClick={handleLogout} className="text-gray-500 hover:text-white p-1.5">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  )
}

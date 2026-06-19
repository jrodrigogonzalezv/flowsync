import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/auth/LoginPage'
import AppLayout from './components/layout/AppLayout'
import SuperAdminLayout from './components/layout/SuperAdminLayout'
import Dashboard from './pages/Dashboard'
import WorkflowsPage from './pages/WorkflowsPage'
import WorkflowBuilderPage from './pages/WorkflowBuilderPage'
import ClientsPage from './pages/ClientsPage'
import ClientFlowPage from './pages/ClientFlowPage'
import TeamPage from './pages/TeamPage'
import JoinPage from './pages/JoinPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SuperAdminPage from './pages/superadmin/SuperAdminPage'
import OrgDetailPage from './pages/superadmin/OrgDetailPage'
import ExecutionDetailPage from './pages/superadmin/ExecutionDetailPage'
import WorkflowDetailPage from './pages/superadmin/WorkflowDetailPage'
import SADashboard from './pages/superadmin/SADashboard'
import SASearch from './pages/superadmin/SASearch'
import SASettings from './pages/superadmin/SASettings'
import ClientPortalPage from './pages/ClientPortalPage'
import VerifySignaturePage from './pages/VerifySignaturePage'

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
  </div>
)

function BlockedScreen() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  async function handleLogout() { await logout(); navigate('/login') }
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">🔒</div>
        <h1 className="text-xl font-bold text-slate-900">Cuenta suspendida</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Tu cuenta ha sido suspendida temporalmente. Contacta a soporte para más información.</p>
        <button onClick={handleLogout} className="mt-6 text-sm text-slate-400 hover:text-red-600 transition-colors">Cerrar sesión</button>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.isSuperAdmin) return <Navigate to="/superadmin/dashboard" replace />
  if (user.profile?.role === 'client') return <Navigate to="/portal" replace />
  if (user.orgBlocked) return <BlockedScreen />
  return children
}

function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!user.isSuperAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.profile?.role !== 'admin') return <Navigate to="/clients" replace />
  return children
}

function SARoute({ page }) {
  return (
    <SuperAdminRoute>
      <SuperAdminLayout>{page}</SuperAdminLayout>
    </SuperAdminRoute>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/flow/:id" element={<ClientFlowPage />} />
      <Route path="/portal" element={<ClientPortalPage />} />
      <Route path="/verify/:executionId/:nodeId" element={<VerifySignaturePage />} />
      <Route path="/join" element={<JoinPage />} />

      {/* Super admin — layout completamente separado */}
      <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />
      <Route path="/superadmin/dashboard" element={<SARoute page={<SADashboard />} />} />
      <Route path="/superadmin/orgs" element={<SARoute page={<SuperAdminPage />} />} />
      <Route path="/superadmin/search" element={<SARoute page={<SASearch />} />} />
      <Route path="/superadmin/settings" element={<SARoute page={<SASettings />} />} />
      <Route path="/superadmin/org/:orgId" element={<SARoute page={<OrgDetailPage />} />} />
      <Route path="/superadmin/org/:orgId/execution/:execId" element={<SARoute page={<ExecutionDetailPage />} />} />
      <Route path="/superadmin/org/:orgId/workflow/:workflowId" element={<SARoute page={<WorkflowDetailPage />} />} />

      {/* App normal — usuarios y admins de empresas */}
      <Route path="/*" element={
        <PrivateRoute>
          <AppLayout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workflows" element={<AdminRoute><WorkflowsPage /></AdminRoute>} />
              <Route path="/workflows/:id" element={<AdminRoute><WorkflowBuilderPage /></AdminRoute>} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/team" element={<AdminRoute><TeamPage /></AdminRoute>} />
              <Route path="/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppLayout>
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

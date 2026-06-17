import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
  </div>
)

// Solo usuarios normales (no superadmin)
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.isSuperAdmin) return <Navigate to="/superadmin" replace />
  return children
}

// Solo superadmin
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

function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/flow/:id" element={<ClientFlowPage />} />
      <Route path="/join" element={<JoinPage />} />

      {/* Super admin — layout completamente separado */}
      <Route path="/superadmin" element={
        <SuperAdminRoute>
          <SuperAdminLayout><SuperAdminPage /></SuperAdminLayout>
        </SuperAdminRoute>
      } />
      <Route path="/superadmin/org/:orgId" element={
        <SuperAdminRoute>
          <SuperAdminLayout><OrgDetailPage /></SuperAdminLayout>
        </SuperAdminRoute>
      } />
      <Route path="/superadmin/org/:orgId/execution/:execId" element={
        <SuperAdminRoute>
          <SuperAdminLayout><ExecutionDetailPage /></SuperAdminLayout>
        </SuperAdminRoute>
      } />
      <Route path="/superadmin/org/:orgId/workflow/:workflowId" element={
        <SuperAdminRoute>
          <SuperAdminLayout><WorkflowDetailPage /></SuperAdminLayout>
        </SuperAdminRoute>
      } />

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

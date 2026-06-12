import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/auth/LoginPage'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import WorkflowsPage from './pages/WorkflowsPage'
import WorkflowBuilderPage from './pages/WorkflowBuilderPage'
import ClientsPage from './pages/ClientsPage'
import ClientFlowPage from './pages/ClientFlowPage'
import TeamPage from './pages/TeamPage'
import JoinPage from './pages/JoinPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/flow/:id" element={<ClientFlowPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workflows" element={<AdminRoute><WorkflowsPage /></AdminRoute>} />
                <Route path="/workflows/:id" element={<AdminRoute><WorkflowBuilderPage /></AdminRoute>} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/team" element={<AdminRoute><TeamPage /></AdminRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </PrivateRoute>
        }
      />
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

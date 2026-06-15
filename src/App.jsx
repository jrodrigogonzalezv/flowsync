import { Component } from 'react'
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

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff1f2', minHeight: '100vh' }}>
        <h2 style={{ color: '#dc2626', marginBottom: 12 }}>Error en la aplicación</h2>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#7f1d1d', fontSize: 13 }}>
          {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
        </pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Recargar
        </button>
      </div>
    )
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

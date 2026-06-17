import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Link } from 'react-router-dom'
import { Building2, Users, GitBranch, RefreshCw, ChevronRight, UserCheck } from 'lucide-react'

const PLAN_CONFIG = {
  trial:    { label: 'Trial',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  active:   { label: 'Activa',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  inactive: { label: 'Inactiva', bg: 'bg-slate-100',   text: 'text-slate-500'   },
  free:     { label: 'Free',     bg: 'bg-blue-100',    text: 'text-blue-700'    },
}

function getPlan(org) {
  return org.plan || 'free'
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [workflowsMap, setWorkflowsMap] = useState({})
  const [executionsMap, setExecutionsMap] = useState({})
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const [orgsSnap, usersSnap, wfSnap, exSnap] = await Promise.all([
        getDocs(query(collection(db, 'organizations'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'workflows')),
        getDocs(collection(db, 'executions')),
      ])

      setOrgs(orgsSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const um = {}
      usersSnap.docs.forEach(d => {
        const data = d.data()
        const orgId = data.orgId
        if (!orgId) return
        if (!um[orgId]) um[orgId] = { adminEmail: '', adminName: '', supervisorCount: 0 }
        if (data.role === 'admin') {
          um[orgId].adminEmail = data.email || ''
          um[orgId].adminName = data.displayName || data.email || ''
        } else if (data.role === 'supervisor') {
          um[orgId].supervisorCount++
        }
      })
      setUsersMap(um)

      const wm = {}
      wfSnap.docs.forEach(d => {
        const orgId = d.data().orgId || d.data().userId
        if (orgId) wm[orgId] = (wm[orgId] || 0) + 1
      })
      setWorkflowsMap(wm)

      const em = {}
      exSnap.docs.forEach(d => {
        const orgId = d.data().orgId
        if (orgId) em[orgId] = (em[orgId] || 0) + 1
      })
      setExecutionsMap(em)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const totalOrgs = orgs.length
  const activeOrgs = orgs.filter(o => getPlan(o) === 'active').length
  const trialOrgs = orgs.filter(o => ['trial', 'free'].includes(getPlan(o))).length
  const inactiveOrgs = orgs.filter(o => getPlan(o) === 'inactive').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Super Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vista global de todas las organizaciones</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total orgs',  value: totalOrgs,    color: 'text-slate-900'   },
          { label: 'Activas',     value: activeOrgs,   color: 'text-emerald-700' },
          { label: 'Trial / Free', value: trialOrgs,   color: 'text-amber-700'   },
          { label: 'Inactivas',   value: inactiveOrgs, color: 'text-slate-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Organizaciones</h2>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Organización</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center justify-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Supervisores</span>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center justify-center gap-1"><GitBranch className="w-3.5 h-3.5" /> Flujos</span>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" /> Clientes</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orgs.map(org => {
                  const info = usersMap[org.id] || {}
                  const plan = getPlan(org)
                  const planConf = PLAN_CONFIG[plan] || PLAN_CONFIG.free
                  return (
                    <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{org.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{org.id?.slice(0, 10)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700 font-medium">{info.adminName || '—'}</p>
                        <p className="text-xs text-slate-400">{info.adminEmail || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        {info.supervisorCount || 0}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        {workflowsMap[org.id] || 0}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        {executionsMap[org.id] || 0}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planConf.bg} ${planConf.text}`}>
                          {planConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/superadmin/org/${org.id}`}
                          className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium whitespace-nowrap"
                        >
                          Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                      No hay organizaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Link } from 'react-router-dom'
import { Search, Building2, User } from 'lucide-react'

const PLAN_CONFIG = {
  trial:    { label: 'Trial',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  active:   { label: 'Activa',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  inactive: { label: 'Inactiva', bg: 'bg-slate-100',   text: 'text-slate-500'   },
  free:     { label: 'Free',     bg: 'bg-blue-100',    text: 'text-blue-700'    },
}

const ROLE_LABELS = {
  admin:      { label: 'Admin',      bg: 'bg-blue-50',   text: 'text-blue-700'  },
  supervisor: { label: 'Supervisor', bg: 'bg-slate-100', text: 'text-slate-600' },
}

export default function SASearch() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [orgs, setOrgs] = useState([])
  const [orgsMap, setOrgsMap] = useState({})
  const [adminMap, setAdminMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [usersResult, orgsResult] = await Promise.allSettled([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'organizations')),
      ])

      let userList = []
      if (usersResult.status === 'fulfilled')
        userList = usersResult.value.docs.map(d => ({ id: d.id, ...d.data() }))
      setUsers(userList)

      if (orgsResult.status === 'fulfilled') {
        const list = orgsResult.value.docs.map(d => ({ id: d.id, ...d.data() }))
        setOrgs(list)
        const om = {}
        list.forEach(o => { om[o.id] = o })
        setOrgsMap(om)
      }

      // Build admin map: orgId → admin user
      const am = {}
      userList.forEach(u => { if (u.role === 'admin' && u.orgId) am[u.orgId] = u })
      setAdminMap(am)

      setLoading(false)
    }
    load()
  }, [])

  const term = query.trim().toLowerCase()

  const filteredUsers = useMemo(() => {
    if (!term) return []
    return users.filter(u =>
      u.email?.toLowerCase().includes(term) ||
      u.displayName?.toLowerCase().includes(term)
    )
  }, [term, users])

  const filteredOrgs = useMemo(() => {
    if (!term) return []
    return orgs.filter(o =>
      o.name?.toLowerCase().includes(term) ||
      adminMap[o.id]?.email?.toLowerCase().includes(term)
    )
  }, [term, orgs, adminMap])

  const hasResults = filteredUsers.length > 0 || filteredOrgs.length > 0

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Búsqueda global</h1>
        <p className="text-sm text-slate-500 mt-0.5">Busca usuarios u organizaciones</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Email, nombre o nombre de organización…"
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white shadow-sm"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !term && (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Escribe para buscar usuarios u organizaciones</p>
        </div>
      )}

      {!loading && term && !hasResults && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">Sin resultados para <strong className="text-slate-600">"{query}"</strong></p>
        </div>
      )}

      <div className="space-y-5">
        {/* Users */}
        {filteredUsers.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Usuarios ({filteredUsers.length})</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredUsers.map(u => {
                const orgId = u.orgId
                const org = orgsMap[orgId]
                const roleConf = ROLE_LABELS[u.role] || ROLE_LABELS.supervisor
                return (
                  <Link
                    key={u.id}
                    to={orgId ? `/superadmin/org/${orgId}` : '#'}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {(u.displayName || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.displayName || u.email}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${roleConf.bg} ${roleConf.text}`}>
                          {roleConf.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {u.email}{org ? ` · ${org.name}` : ''}
                      </p>
                    </div>
                    {orgId && <span className="text-xs text-blue-700 flex-shrink-0">Ver org →</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Orgs */}
        {filteredOrgs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Organizaciones ({filteredOrgs.length})</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredOrgs.map(org => {
                const plan = org.plan || 'free'
                const planConf = PLAN_CONFIG[plan] || PLAN_CONFIG.free
                const admin = adminMap[org.id]
                return (
                  <Link
                    key={org.id}
                    to={`/superadmin/org/${org.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${planConf.bg} ${planConf.text}`}>
                          {planConf.label}
                        </span>
                      </div>
                      {admin && <p className="text-xs text-slate-400 truncate">{admin.email}</p>}
                    </div>
                    <span className="text-xs text-blue-700 flex-shrink-0">Ver →</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

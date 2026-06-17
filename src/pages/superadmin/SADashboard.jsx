import { useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Link } from 'react-router-dom'
import { RefreshCw, TrendingUp, Building2, AlertTriangle, ChevronRight, Plus } from 'lucide-react'

const PLAN_CONFIG = {
  trial:    { label: 'Trial',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  active:   { label: 'Activa',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  inactive: { label: 'Inactiva', bg: 'bg-slate-100',   text: 'text-slate-500'   },
  free:     { label: 'Free',     bg: 'bg-blue-100',    text: 'text-blue-700'    },
}

const DEFAULT_SETTINGS = { prices: { free: 0, trial: 0, active: 29, inactive: 0 }, currency: 'USD', trialDays: 30 }

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getChurnSignals(org, wfCount, exCount, lastExDate, trialDays) {
  const signals = []
  if (wfCount === 0) signals.push('Sin flujos creados')
  else if (exCount === 0) signals.push('Sin clientes invitados')

  const plan = org.plan || 'free'
  if ((plan === 'trial' || plan === 'free') && org.planSince) {
    const since = org.planSince.toDate ? org.planSince.toDate() : new Date(org.planSince)
    const daysPassed = (Date.now() - since.getTime()) / 86400000
    if (daysPassed > (trialDays - 7)) signals.push('Trial por vencer')
  }

  if (lastExDate) {
    const daysSince = (Date.now() - lastExDate.getTime()) / 86400000
    if (daysSince > 30) signals.push('Sin actividad 30+ días')
  } else if (exCount === 0 && org.createdAt) {
    const created = org.createdAt.toDate ? org.createdAt.toDate() : new Date(org.createdAt)
    const daysSince = (Date.now() - created.getTime()) / 86400000
    if (daysSince > 30) signals.push('Sin actividad 30+ días')
  }

  return signals
}

export default function SADashboard() {
  const [orgs, setOrgs] = useState([])
  const [wfMap, setWfMap] = useState({})
  const [exMap, setExMap] = useState({})
  const [lastExMap, setLastExMap] = useState({})
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    const [orgsResult, wfResult, exResult, settingsResult] = await Promise.allSettled([
      getDocs(query(collection(db, 'organizations'), orderBy('createdAt', 'desc'))),
      getDocs(collection(db, 'workflows')),
      getDocs(collection(db, 'executions')),
      getDoc(doc(db, 'config', 'saasSettings')),
    ])

    if (orgsResult.status === 'fulfilled')
      setOrgs(orgsResult.value.docs.map(d => ({ id: d.id, ...d.data() })))

    if (wfResult.status === 'fulfilled') {
      const m = {}
      wfResult.value.docs.forEach(d => {
        const orgId = d.data().orgId || d.data().userId
        if (orgId) m[orgId] = (m[orgId] || 0) + 1
      })
      setWfMap(m)
    }

    if (exResult.status === 'fulfilled') {
      const cm = {}
      const lm = {}
      exResult.value.docs.forEach(d => {
        const { orgId, createdAt } = d.data()
        if (!orgId) return
        cm[orgId] = (cm[orgId] || 0) + 1
        const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null
        if (date && (!lm[orgId] || date > lm[orgId])) lm[orgId] = date
      })
      setExMap(cm)
      setLastExMap(lm)
    }

    if (settingsResult.status === 'fulfilled' && settingsResult.value.exists())
      setSettings({ ...DEFAULT_SETTINGS, ...settingsResult.value.data() })

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const currency = settings.currency || 'USD'
  const prices = settings.prices || DEFAULT_SETTINGS.prices
  const trialDays = settings.trialDays || 30

  const mrr = orgs.reduce((sum, org) => sum + (prices[org.plan || 'free'] || 0), 0)
  const activeOrgs = orgs.filter(o => o.plan === 'active').length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = orgs.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt ? new Date(o.createdAt) : null
    return d && d >= startOfMonth
  })

  const churnOrgs = orgs
    .map(org => ({
      org,
      signals: getChurnSignals(org, wfMap[org.id] || 0, exMap[org.id] || 0, lastExMap[org.id] || null, trialDays),
    }))
    .filter(({ signals }) => signals.length > 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visión global del negocio</p>
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
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-xs text-slate-400 font-medium">MRR</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {currency === 'CLP' ? `$${mrr.toLocaleString('es-CL')}` : `$${mrr}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{currency}/mes</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Total orgs</p>
          <p className="text-2xl font-bold text-slate-900">{orgs.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Activas (pago)</p>
          <p className="text-2xl font-bold text-emerald-700">{activeOrgs}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-slate-400 font-medium">En riesgo</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{churnOrgs.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Churn risk */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900">Riesgo de churn ({churnOrgs.length})</h2>
          </div>
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : churnOrgs.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">¡Sin orgs en riesgo!</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {churnOrgs.map(({ org, signals }) => {
                const plan = org.plan || 'free'
                const planConf = PLAN_CONFIG[plan] || PLAN_CONFIG.free
                return (
                  <div key={org.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900">{org.name}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${planConf.bg} ${planConf.text}`}>
                          {planConf.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {signals.map(s => (
                          <span key={s} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      to={`/superadmin/org/${org.id}`}
                      className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium flex-shrink-0 mt-0.5"
                    >
                      Ver <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* New this month */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">Nuevas este mes ({newThisMonth.length})</h2>
          </div>
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : newThisMonth.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">Sin orgs nuevas este mes.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {newThisMonth.map(org => {
                const plan = org.plan || 'free'
                const planConf = PLAN_CONFIG[plan] || PLAN_CONFIG.free
                return (
                  <div key={org.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                      <p className="text-xs text-slate-400">{formatDate(org.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${planConf.bg} ${planConf.text}`}>
                      {planConf.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

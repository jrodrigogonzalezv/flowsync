import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Save, TrendingUp } from 'lucide-react'

const DEFAULT_SETTINGS = {
  prices: { free: 0, trial: 0, active: 29, inactive: 0 },
  currency: 'USD',
  trialDays: 30,
}

const PLAN_LABELS = {
  free:     'Free',
  trial:    'Trial',
  active:   'Activa',
  inactive: 'Inactiva',
}

export default function SASettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [settingsResult, orgsResult] = await Promise.allSettled([
        getDoc(doc(db, 'config', 'saasSettings')),
        getDocs(collection(db, 'organizations')),
      ])
      if (settingsResult.status === 'fulfilled' && settingsResult.value.exists())
        setSettings({ ...DEFAULT_SETTINGS, ...settingsResult.value.data() })
      if (orgsResult.status === 'fulfilled')
        setOrgs(orgsResult.value.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [])

  function setPrice(plan, value) {
    const num = Math.max(0, parseFloat(value) || 0)
    setSettings(s => ({ ...s, prices: { ...s.prices, [plan]: num } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await setDoc(doc(db, 'config', 'saasSettings'), settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const mrr = orgs.reduce((sum, org) => sum + (settings.prices[org.plan || 'free'] || 0), 0)
  const currency = settings.currency || 'USD'

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Configuración del SaaS</h1>
        <p className="text-sm text-slate-500 mt-0.5">Precios, moneda y parámetros del sistema</p>
      </div>

      {/* Plan prices */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Precio por plan (mensual)</h2>
        <div className="space-y-3">
          {Object.keys(PLAN_LABELS).map(plan => (
            <div key={plan} className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 w-24">{PLAN_LABELS[plan]}</label>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-slate-400">{currency}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.prices[plan] ?? 0}
                  onChange={e => setPrice(plan, e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <span className="text-sm text-slate-400">/mes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Configuración general</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700 w-24">Moneda</label>
            <select
              value={settings.currency}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="USD">USD — Dólar</option>
              <option value="CLP">CLP — Peso chileno</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700 w-24">Días trial</label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.trialDays}
              onChange={e => setSettings(s => ({ ...s, trialDays: parseInt(e.target.value) || 30 }))}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
        </div>
      </div>

      {/* MRR preview */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-purple-900">Preview MRR con precios actuales</h2>
        </div>
        <p className="text-3xl font-bold text-purple-800 mt-2">
          {currency === 'CLP' ? `$${mrr.toLocaleString('es-CL')}` : `$${mrr}`}
          <span className="text-base font-normal text-purple-500 ml-1">{currency}/mes</span>
        </p>
        <p className="text-xs text-purple-500 mt-1">Basado en {orgs.length} organizaciones registradas</p>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white text-sm font-medium rounded-xl hover:bg-purple-800 transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saved ? '¡Guardado!' : saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

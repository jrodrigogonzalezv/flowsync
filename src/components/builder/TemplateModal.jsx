import { X, Plus, FileText, Users } from 'lucide-react'

const TEMPLATES = [
  {
    id: 'blank',
    icon: Plus,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100 border-slate-200',
    name: 'Empezar desde cero',
    description: 'Canvas en blanco. Diseña tu propio flujo.',
    nodes: null,
    edges: null,
    defaultName: 'Nuevo flujo',
  },
  {
    id: 'admission',
    icon: FileText,
    iconColor: 'text-blue-700',
    iconBg: 'bg-blue-50 border-blue-200',
    name: 'Proceso de admisión',
    description: 'Formulario de datos → Información adicional → Análisis IA → Fin.',
    defaultName: 'Proceso de admisión',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 240, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-2', type: 'form', position: { x: 160, y: 160 }, data: {
          label: 'Datos personales',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'Email', type: 'email', required: true },
            { id: 'f3', label: 'Teléfono', type: 'text', required: false },
          ],
        },
      },
      {
        id: 'form-3', type: 'form', position: { x: 160, y: 340 }, data: {
          label: 'Información adicional',
          fields: [
            { id: 'f4', label: '¿Por qué te interesa?', type: 'textarea', required: true },
            { id: 'f5', label: 'Experiencia previa', type: 'textarea', required: false },
          ],
        },
      },
      {
        id: 'ai-4', type: 'ai', position: { x: 160, y: 520 }, data: {
          label: 'Análisis IA',
          aiPrompt: 'Analiza el perfil del candidato y proporciona una evaluación breve sobre su idoneidad para el proceso.',
        },
      },
      { id: 'end-5', type: 'end', position: { x: 240, y: 700 }, data: { label: 'Fin' } },
    ],
    edges: [
      { id: 'e1-2', source: 'start-1', target: 'form-2' },
      { id: 'e2-3', source: 'form-2', target: 'form-3' },
      { id: 'e3-4', source: 'form-3', target: 'ai-4' },
      { id: 'e4-5', source: 'ai-4', target: 'end-5' },
    ],
  },
  {
    id: 'onboarding',
    icon: Users,
    iconColor: 'text-emerald-700',
    iconBg: 'bg-emerald-50 border-emerald-200',
    name: 'Onboarding de cliente',
    description: 'Bienvenida → Configuración → Análisis IA → Notificación → Fin.',
    defaultName: 'Onboarding de cliente',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 240, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-2', type: 'form', position: { x: 160, y: 160 }, data: {
          label: 'Información de la empresa',
          fields: [
            { id: 'f1', label: 'Nombre de la empresa', type: 'text', required: true },
            { id: 'f2', label: 'Industria', type: 'text', required: true },
            { id: 'f3', label: 'Número de empleados', type: 'number', required: false },
          ],
        },
      },
      {
        id: 'form-3', type: 'form', position: { x: 160, y: 340 }, data: {
          label: 'Objetivos',
          fields: [
            { id: 'f4', label: '¿Qué quieres lograr?', type: 'textarea', required: true },
            { id: 'f5', label: 'Plazo estimado', type: 'text', required: false },
          ],
        },
      },
      {
        id: 'ai-4', type: 'ai', position: { x: 160, y: 520 }, data: {
          label: 'Recomendaciones IA',
          aiPrompt: 'Basado en los datos del cliente, genera recomendaciones personalizadas para su proceso de onboarding.',
        },
      },
      {
        id: 'notification-5', type: 'notification', position: { x: 160, y: 700 }, data: {
          label: 'Confirmación',
          subject: '¡Bienvenido a bordo!',
          message: 'Hemos recibido tu información y estamos preparando todo para comenzar. Te contactaremos pronto.',
        },
      },
      { id: 'end-6', type: 'end', position: { x: 240, y: 880 }, data: { label: 'Fin' } },
    ],
    edges: [
      { id: 'e1-2', source: 'start-1', target: 'form-2' },
      { id: 'e2-3', source: 'form-2', target: 'form-3' },
      { id: 'e3-4', source: 'form-3', target: 'ai-4' },
      { id: 'e4-5', source: 'ai-4', target: 'notification-5' },
      { id: 'e5-6', source: 'notification-5', target: 'end-6' },
    ],
  },
]

export default function TemplateModal({ onSelect }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Crear nuevo flujo</h3>
          <p className="text-slate-500 text-sm mt-1">Elige una plantilla para empezar más rápido.</p>
        </div>
        <div className="p-6 space-y-3">
          {TEMPLATES.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="w-full flex items-center gap-4 text-left px-4 py-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
                  <Icon className={`w-5 h-5 ${t.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm group-hover:text-blue-800 transition-colors">{t.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{t.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

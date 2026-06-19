import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Loader2, ShieldCheck, AlertCircle, Zap, FileText, CheckCircle } from 'lucide-react'

export default function VerifySignaturePage() {
  const { executionId, nodeId } = useParams()
  const [state, setState] = useState('loading') // loading | valid | invalid
  const [data, setData] = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'executions', executionId))
      .then(snap => {
        if (!snap.exists()) { setState('invalid'); return }
        const exec = snap.data()
        const sig = exec.responses?.[nodeId]
        if (!sig || sig.type !== 'signature') { setState('invalid'); return }
        setData({ ...sig, workflowName: exec.workflowName, clientEmail: exec.clientEmail })
        setState('valid')
      })
      .catch(() => setState('invalid'))
  }, [executionId, nodeId])

  if (state === 'loading') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-blue-800 animate-spin" />
    </div>
  )

  if (state === 'invalid') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Certificado no encontrado</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Este QR no corresponde a ningún documento firmado en nuestro sistema,
          o el link es inválido.
        </p>
      </div>
    </div>
  )

  const auditRows = [
    ['Firmante',         data.signerEmail],
    ['Fecha y hora',     data.signedAt ? new Date(data.signedAt).toLocaleString('es-CL') : null],
    ['Dirección IP',     data.ipAddress],
    ['Método',           data.method === 'draw' ? 'Firma manuscrita digital' : 'Nombre escrito'],
    ['ID de ejecución',  executionId],
  ].filter(([, v]) => v)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center gap-2.5 h-14">
          <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Verificación de firma</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* Valid badge */}
        <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <ShieldCheck className="w-9 h-9 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-base">Firma electrónica válida</p>
            <p className="text-sm text-emerald-600 mt-0.5">Documento verificado · Ley 19.799 de Chile</p>
          </div>
        </div>

        {/* Process name */}
        {data.workflowName && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Proceso</p>
            <h1 className="text-xl font-bold text-slate-900">{data.workflowName}</h1>
          </div>
        )}

        {/* Signature image */}
        {data.imageUrl && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Firma capturada</p>
            <img
              src={data.imageUrl}
              alt="Firma electrónica"
              className="w-full rounded-xl border border-slate-100 bg-white object-contain"
              style={{ maxHeight: 140 }}
            />
          </div>
        )}

        {/* Audit trail */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-4">Registro de auditoría</p>
          <div className="space-y-3">
            {auditRows.map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-sm text-slate-500 w-36 flex-shrink-0">{label}</span>
                <span className="text-sm text-slate-900 font-medium break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download certificate */}
        {data.certificateUrl && (
          <a
            href={data.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Descargar certificado PDF
          </a>
        )}

        {/* Legal disclaimer */}
        <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-purple-700 leading-relaxed">
            Esta firma electrónica simple fue generada de conformidad con la{' '}
            <strong>Ley 19.799</strong> sobre documentos electrónicos, firma electrónica y
            servicios de certificación de la República de Chile.
          </p>
        </div>

      </div>
    </div>
  )
}

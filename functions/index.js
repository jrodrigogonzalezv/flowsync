const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { defineSecret } = require('firebase-functions/params')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const admin = require('firebase-admin')

if (!admin.apps.length) admin.initializeApp()

const geminiApiKey = defineSecret('GEMINI_API_KEY')
const resendApiKey = defineSecret('RESEND_API_KEY')

// ─── Email helper (Resend) ────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, fromName = 'FlowSync' }) {
  const { Resend } = require('resend')
  const resend = new Resend(resendApiKey.value())
  const { data, error } = await resend.emails.send({
    from: `${fromName} <noreply@system.cl>`,
    to,
    subject,
    html,
  })
  if (error) {
    console.error('Resend error:', JSON.stringify(error))
    throw new Error(error.message)
  }
  console.log('Email sent:', data?.id)
}

// ─── analyzeFlow ─────────────────────────────────────────────────────────────

exports.analyzeFlow = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const { responses, aiPrompt, knowledgeBase } = request.data
  if (!responses || !aiPrompt) throw new HttpsError('invalid-argument', 'Faltan datos para el análisis.')

  const genAI = new GoogleGenerativeAI(geminiApiKey.value())
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const systemPrompt = [
    aiPrompt,
    knowledgeBase ? `\n\nBase de conocimiento:\n${knowledgeBase}` : '',
    '\n\nResponde siempre en español. Sé claro, conciso y útil para el cliente.',
  ].join('')

  const formattedResponses = Object.entries(responses)
    .map(([, data]) => Object.entries(data).map(([k, v]) => `- ${k}: ${v}`).join('\n'))
    .join('\n\n')

  const result = await model.generateContent(`${systemPrompt}\n\nRespuestas del cliente:\n\n${formattedResponses}`)
  return { result: result.response.text() }
})

// ─── extractKnowledgeBaseFile ─────────────────────────────────────────────────

exports.extractKnowledgeBaseFile = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const { storagePath, fileType, mimeType } = request.data
  if (!storagePath || !fileType) throw new HttpsError('invalid-argument', 'Faltan parámetros.')

  const [buffer] = await admin.storage().bucket().file(storagePath).download()
  let extractedText = ''

  if (fileType === 'txt') {
    extractedText = buffer.toString('utf-8')
  } else if (fileType === 'pdf') {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    extractedText = data.text
  } else if (fileType === 'docx') {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    extractedText = result.value
  } else if (fileType === 'image') {
    const genAI = new GoogleGenerativeAI(geminiApiKey.value())
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent([
      { inlineData: { data: buffer.toString('base64'), mimeType: mimeType || 'image/jpeg' } },
      'Extrae todo el texto de esta imagen de forma literal y completa. Si no hay texto visible, describe el contenido relevante en detalle.',
    ])
    extractedText = result.response.text()
  } else {
    throw new HttpsError('invalid-argument', `Tipo no soportado: ${fileType}`)
  }

  return { extractedText: extractedText.trim() }
})

// ─── sendInviteEmail ──────────────────────────────────────────────────────────

exports.sendInviteEmail = onCall({ secrets: [resendApiKey] }, async (request) => {
  const { clientName, clientEmail, workflowName, flowLink, senderName } = request.data
  if (!clientEmail || !flowLink) throw new HttpsError('invalid-argument', 'Faltan datos.')

  await sendEmail({
    to: clientEmail,
    subject: `${senderName || 'Te invitan'} a completar: ${workflowName}`,
    html: buildEmailHtml({
      title: `${senderName || 'Un equipo'} te invita a completar un proceso`,
      name: clientName,
      body: `Has sido invitado a participar en el flujo <strong>"${workflowName}"</strong>. Solo toma unos minutos completarlo desde tu navegador.`,
      cta: 'Comenzar proceso →',
      link: flowLink,
    }),
  })
  return { sent: true }
})

// ─── sendTeamInvite ───────────────────────────────────────────────────────────

exports.sendTeamInvite = onCall({ secrets: [resendApiKey] }, async (request) => {
  const { email, role, inviteLink, senderName } = request.data
  if (!email || !inviteLink) throw new HttpsError('invalid-argument', 'Faltan datos.')

  const roleLabel = role === 'admin' ? 'Administrador' : 'Supervisor'
  await sendEmail({
    to: email,
    subject: `${senderName || 'Alguien'} te invita a unirte a FlowSync como ${roleLabel}`,
    html: buildEmailHtml({
      title: `${senderName || 'Alguien'} te invita a unirte a FlowSync`,
      name: email.split('@')[0],
      body: `Has sido invitado como <strong>${roleLabel}</strong>. Haz clic para aceptar la invitación.`,
      cta: 'Aceptar invitación →',
      link: inviteLink,
    }),
  })
  return { sent: true }
})

// ─── resendFlowLink ───────────────────────────────────────────────────────────

exports.resendFlowLink = onCall({ secrets: [resendApiKey] }, async (request) => {
  const { email } = request.data
  if (!email) throw new HttpsError('invalid-argument', 'Falta el email.')

  const db = admin.firestore()
  const snap = await db.collection('executions')
    .where('clientEmail', '==', email)
    .where('status', 'in', ['invited', 'in_progress'])
    .get()

  if (snap.empty) return { sent: false, reason: 'No hay procesos pendientes.' }

  const origin = 'https://flowsync-e9709.web.app'
  const links = snap.docs.map(d => {
    const data = d.data()
    return `<li style="margin-bottom:8px"><a href="${origin}/flow/${d.id}" style="color:#1e3a8a">${data.workflowName || 'Proceso'}</a> — ${data.completedNodes || 0}/${data.totalNodes || 0} pasos completados</li>`
  }).join('')

  await sendEmail({
    to: email,
    subject: 'Tus procesos pendientes en FlowSync',
    html: buildEmailHtml({
      title: 'Tus procesos pendientes',
      name: email.split('@')[0],
      body: `Encontramos los siguientes procesos pendientes:<ul style="margin:12px 0;padding-left:20px">${links}</ul>`,
      cta: null,
      link: null,
    }),
  })
  return { sent: true }
})

// ─── sendReminders (daily) ────────────────────────────────────────────────────

exports.sendReminders = onSchedule(
  { schedule: 'every 24 hours', secrets: [resendApiKey], timeZone: 'America/Santiago' },
  async () => {
    const db = admin.firestore()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const snap = await db.collection('executions')
      .where('status', 'in', ['invited', 'in_progress'])
      .where('remindersSent', '==', 0)
      .get()

    const batch = db.batch()
    const origin = 'https://flowsync-e9709.web.app'

    for (const docSnap of snap.docs) {
      const data = docSnap.data()
      const updatedAt = data.updatedAt?.toDate()
      if (!updatedAt || updatedAt > cutoff) continue
      if (!data.clientEmail) continue

      try {
        await sendEmail({
          to: data.clientEmail,
          subject: `Recordatorio: completa tu proceso "${data.workflowName || 'pendiente'}"`,
          html: buildEmailHtml({
            title: `Tienes un proceso pendiente`,
            name: data.clientName || 'Cliente',
            body: `Te recordamos que tienes el proceso <strong>"${data.workflowName}"</strong> pendiente. Llevas <strong>${data.completedNodes || 0} de ${data.totalNodes || 0} pasos</strong> completados.`,
            cta: 'Continuar donde lo dejé →',
            link: `${origin}/flow/${docSnap.id}`,
          }),
        })
      } catch (e) {
        console.error(`Reminder error for ${data.clientEmail}:`, e.message)
      }

      batch.update(docSnap.ref, {
        remindersSent: 1,
        lastReminderAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()
  }
)

// ─── Email template ───────────────────────────────────────────────────────────

function buildEmailHtml({ title, name, body, cta, link }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="background:#1e3a8a;padding:28px 32px;display:flex;align-items:center;gap:12px">
      <div style="width:32px;height:32px;background:rgba(255,255,255,.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
        <span style="color:#fff;font-size:16px">⚡</span>
      </div>
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px">FlowSync</span>
    </div>
    <div style="padding:32px">
      <p style="color:#475569;font-size:14px;margin:0 0 24px">Hola <strong style="color:#0f172a">${name}</strong>,</p>
      <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;line-height:1.3">${title}</h1>
      <p style="color:#475569;font-size:15px;margin:0 0 28px;line-height:1.6">${body}</p>
      ${cta && link ? `
      <a href="${link}" style="display:inline-block;background:#1e3a8a;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;letter-spacing:-.2px">${cta}</a>
      <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;line-height:1.6">Si el botón no funciona copia este enlace:<br><a href="${link}" style="color:#1e3a8a;word-break:break-all">${link}</a></p>
      ` : ''}
    </div>
    <div style="border-top:1px solid #f1f5f9;padding:16px 32px;background:#f8fafc">
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center">Enviado por FlowSync · Si no esperabas este email, puedes ignorarlo.</p>
    </div>
  </div>
</body>
</html>`
}

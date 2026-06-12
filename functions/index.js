const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const nodemailer = require('nodemailer')
const admin = require('firebase-admin')

if (!admin.apps.length) admin.initializeApp()

const geminiApiKey = defineSecret('GEMINI_API_KEY')
const gmailUser = defineSecret('GMAIL_USER')
const gmailPass = defineSecret('GMAIL_PASS')

exports.analyzeFlow = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const { responses, aiPrompt, knowledgeBase } = request.data

  if (!responses || !aiPrompt) {
    throw new HttpsError('invalid-argument', 'Faltan datos para el análisis.')
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey.value())
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const systemPrompt = [
    aiPrompt,
    knowledgeBase ? `\n\nBase de conocimiento:\n${knowledgeBase}` : '',
    '\n\nResponde siempre en español. Sé claro, conciso y útil para el cliente.',
  ].join('')

  const formattedResponses = Object.entries(responses)
    .map(([, data]) =>
      Object.entries(data).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    )
    .join('\n\n')

  const prompt = `${systemPrompt}\n\nRespuestas del cliente:\n\n${formattedResponses}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  return { result: text }
})

exports.extractKnowledgeBaseFile = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const { storagePath, fileType, mimeType } = request.data

  if (!storagePath || !fileType) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros.')
  }

  const bucket = admin.storage().bucket()
  const [buffer] = await bucket.file(storagePath).download()

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
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType || 'image/jpeg',
        },
      },
      'Extrae todo el texto de esta imagen de forma literal y completa. Si no hay texto visible, describe el contenido relevante en detalle.',
    ])
    extractedText = result.response.text()
  } else {
    throw new HttpsError('invalid-argument', `Tipo de archivo no soportado: ${fileType}`)
  }

  return { extractedText: extractedText.trim() }
})

exports.sendInviteEmail = onCall({ secrets: [gmailUser, gmailPass] }, async (request) => {
  const { clientName, clientEmail, workflowName, flowLink, senderName } = request.data

  if (!clientEmail || !flowLink) {
    throw new HttpsError('invalid-argument', 'Faltan datos para enviar el email.')
  }

  const user = gmailUser.value()
  const pass = gmailPass.value()

  if (!user || !pass) {
    return { sent: false, reason: 'Email no configurado.' }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  const html = `
<!DOCTYPE html>
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
      <p style="color:#475569;font-size:14px;margin:0 0 24px">Hola <strong style="color:#0f172a">${clientName}</strong>,</p>
      <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;line-height:1.3">
        ${senderName || 'Un equipo'} te invita a completar un proceso
      </h1>
      <p style="color:#475569;font-size:15px;margin:0 0 28px;line-height:1.6">
        Has sido invitado a participar en el flujo <strong style="color:#0f172a">"${workflowName}"</strong>.
        Solo toma unos minutos completarlo desde tu navegador.
      </p>
      <a href="${flowLink}" style="display:inline-block;background:#1e3a8a;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;letter-spacing:-.2px">
        Comenzar proceso →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;line-height:1.6">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
        <a href="${flowLink}" style="color:#1e3a8a;word-break:break-all">${flowLink}</a>
      </p>
    </div>
    <div style="border-top:1px solid #f1f5f9;padding:16px 32px;background:#f8fafc">
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center">
        Enviado por FlowSync · Si no esperabas este email, puedes ignorarlo.
      </p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `FlowSync <${user}>`,
    to: `${clientName} <${clientEmail}>`,
    subject: `${senderName || 'Te invitan'} a completar: ${workflowName}`,
    html,
  })

  return { sent: true }
})

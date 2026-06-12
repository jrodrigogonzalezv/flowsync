const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const geminiApiKey = defineSecret('GEMINI_API_KEY')

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

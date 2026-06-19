import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

function ascii(str) {
  return (str || '')
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i').replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ÁÀÂÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÍÌÎÏ]/g, 'I').replace(/[ÓÒÔÖ]/g, 'O')
    .replace(/[ÚÙÛÜ]/g, 'U').replace(/[Ñ]/g, 'N')
}

function clamp(str, max) {
  const s = ascii(str || '')
  return s.length > max ? s.slice(0, max - 3) + '...' : s
}

export async function generateSignatureCertificate({
  signatureImageBlob,
  signerEmail,
  signedAt,
  ipAddress,
  method,
  executionId,
  nodeId,
  documentTitle,
}) {
  const verifyUrl = `${window.location.origin}/verify/${executionId}/${nodeId}`

  // QR code → PNG data URL → bytes
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200, margin: 1,
    color: { dark: '#1e293b', light: '#ffffff' },
  })
  const qrBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0))

  // Signature blob → bytes
  const sigBytes = new Uint8Array(await signatureImageBlob.arrayBuffer())

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const W = 595
  const H = 842
  const M = 40

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const sigImage = await pdfDoc.embedPng(sigBytes)
  const qrImage = await pdfDoc.embedPng(qrBytes)

  // Colors
  const purple   = rgb(0.49, 0.13, 0.81)
  const white    = rgb(1, 1, 1)
  const slate900 = rgb(0.05, 0.07, 0.10)
  const slate500 = rgb(0.38, 0.45, 0.55)
  const slate200 = rgb(0.88, 0.91, 0.94)
  const lavender = rgb(0.87, 0.76, 0.96)
  const green    = rgb(0.05, 0.60, 0.35)
  const bgLight  = rgb(0.98, 0.97, 1.0)
  const sigBord  = rgb(0.79, 0.70, 0.95)

  // ── Header bar ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 72, width: W, height: 72, color: purple })
  page.drawText('CERTIFICADO DE FIRMA ELECTRONICA', {
    x: M, y: H - 35, font: bold, size: 14, color: white,
  })
  page.drawText('Firma Electronica Simple  |  Ley 19.799 de Chile', {
    x: M, y: H - 54, font: regular, size: 9, color: lavender,
  })

  // "VALIDO" badge
  page.drawRectangle({ x: W - 112, y: H - 54, width: 72, height: 20, color: green })
  page.drawText('VALIDO', { x: W - 98, y: H - 48, font: bold, size: 10, color: white })

  // ── Document title ──────────────────────────────────────────────────────────
  page.drawText('Documento firmado:', { x: M, y: H - 96, font: regular, size: 9, color: slate500 })
  page.drawText(clamp(documentTitle || 'Firma electronica simple', 62), {
    x: M, y: H - 112, font: bold, size: 13, color: slate900,
  })

  // ── Signature box ───────────────────────────────────────────────────────────
  const sigBoxTop = H - 138
  const sigBoxH = 128
  const sigBoxW = W - 2 * M
  page.drawRectangle({
    x: M, y: sigBoxTop - sigBoxH, width: sigBoxW, height: sigBoxH,
    color: bgLight, borderColor: sigBord, borderWidth: 1,
  })
  page.drawText('Firma del cliente:', { x: M + 10, y: sigBoxTop - 14, font: regular, size: 8, color: slate500 })

  const sigDims = sigImage.scaleToFit(sigBoxW - 40, sigBoxH - 32)
  page.drawImage(sigImage, {
    x: M + (sigBoxW - sigDims.width) / 2,
    y: sigBoxTop - sigBoxH + (sigBoxH - sigDims.height - 20) / 2 + 4,
    width: sigDims.width,
    height: sigDims.height,
  })

  // ── Divider ─────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: M, y: H - 288 }, end: { x: W - M, y: H - 288 },
    color: slate200, thickness: 1,
  })

  // ── Audit data + QR ─────────────────────────────────────────────────────────
  const methodLabel = method === 'draw' ? 'Firma manuscrita digital' : 'Nombre escrito'
  const dateStr = new Date(signedAt).toLocaleString('es-CL')

  const rows = [
    ['Firmante:',          signerEmail || 'No disponible'],
    ['Fecha y hora:',      ascii(dateStr)],
    ['Direccion IP:',      ipAddress || 'No disponible'],
    ['Metodo:',            ascii(methodLabel)],
    ['ID verificacion:',   clamp(executionId, 50)],
  ]

  let rowY = H - 312
  rows.forEach(([label, value]) => {
    page.drawText(label, { x: M, y: rowY, font: bold, size: 9.5, color: slate500 })
    page.drawText(clamp(value, 45), { x: 188, y: rowY, font: regular, size: 9.5, color: slate900 })
    rowY -= 22
  })

  // QR code (right side, aligned with audit rows)
  const qrSize = 108
  const qrX = W - M - qrSize
  const qrY = H - 420
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })
  page.drawText('Escanea para verificar', { x: qrX, y: qrY - 14, font: regular, size: 7.5, color: slate500 })

  // ── Verify URL ───────────────────────────────────────────────────────────────
  page.drawText('Verificar en linea:', { x: M, y: H - 460, font: bold, size: 8, color: slate500 })
  page.drawText(verifyUrl, { x: M, y: H - 474, font: regular, size: 8, color: purple })

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: 46, color: rgb(0.97, 0.97, 0.98) })
  page.drawLine({ start: { x: 0, y: 46 }, end: { x: W, y: 46 }, color: slate200, thickness: 1 })
  page.drawText(
    'Este certificado acredita la firma electronica simple de conformidad con la Ley 19.799 sobre',
    { x: M, y: 29, font: regular, size: 7.5, color: slate500 },
  )
  page.drawText(
    'documentos electronicos, firma electronica y servicios de certificacion de la Republica de Chile.',
    { x: M, y: 16, font: regular, size: 7.5, color: slate500 },
  )

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

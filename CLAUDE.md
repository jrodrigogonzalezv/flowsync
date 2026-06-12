# FlowSync — Contexto del Proyecto para Claude

> Léeme antes de hacer cualquier cosa. Este archivo existe para que Claude retome el proyecto sin que el usuario tenga que explicar nada.

---

## ¿Qué es FlowSync?

SaaS multi-tenant de automatización de flujos con IA. Permite:
- Crear flujos visuales (drag-and-drop) con nodos: Inicio, Formulario, Análisis IA, Condición, Notificación, Fin
- Enviar un link a clientes para que completen el flujo paso a paso desde el navegador
- La IA (Gemini) analiza las respuestas del cliente contra una base de conocimiento (texto + documentos)
- Kanban en tiempo real que muestra el progreso de cada cliente
- Roles: Admin (crea flujos, gestiona equipo) / Supervisor (solo ve clientes)
- Multi-tenant: cada organización tiene su propio `orgId`; los supervisors comparten acceso a los datos del admin

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite, Tailwind CSS v4, React Router v7, React Flow (`@xyflow/react`) |
| Auth | Firebase Auth (Google OAuth + email/password) |
| Base de datos | Firestore (onSnapshot real-time) |
| Storage | Firebase Storage (documentos KB) |
| Backend | Firebase Functions v2 (Node 20, onCall + onSchedule) |
| IA | Google Gemini `gemini-1.5-flash` via `@google/generative-ai` |
| Email | Resend.com (`resend` npm package) via Firebase Function |
| Hosting | Firebase Hosting |
| Icons | Lucide React |

---

## Diseño / tema

Light profesional: fondos `bg-slate-50`/white, acento `blue-800`, texto slate.
**No usar colores oscuros** (gray-900, gray-950, text-white sobre fondo oscuro).

---

## Estructura de archivos clave

```
src/
  lib/firebase.js                    — inicialización Firebase, exports: auth, db, storage
  hooks/useAuth.jsx                  — auth context: user, loading, loginWithGoogle, loginWithEmail,
                                       registerWithEmail, logout, claimInvite
  App.jsx                            — rutas: /login, /flow/:id, /join (públicas); resto privadas
                                       AdminRoute: /workflows, /workflows/:id, /team
  index.css                          — solo reset básico (@import "tailwindcss")
  pages/
    Dashboard.jsx                    — stats, actividad reciente, analytics
    WorkflowsPage.jsx                — lista de flujos (filtra por orgId)
    WorkflowBuilderPage.jsx          — editor con header + KnowledgeBaseModal
    ClientsPage.jsx                  — Kanban de clientes (filtra por orgId)
    ClientFlowPage.jsx               — vista pública del cliente + RecoverLinkScreen
    TeamPage.jsx                     — gestión de miembros e invitaciones (solo admin)
    JoinPage.jsx                     — página de aceptación de invitación de equipo (/join?invite=ID)
  components/
    layout/AppLayout.jsx             — navbar (adminNav/supervisorNav), badge de rol
    auth/LoginPage.jsx               — login split layout
    kb/KnowledgeBaseModal.jsx        — modal KB: texto manual + upload de archivos
    builder/
      WorkflowBuilder.jsx            — React Flow canvas
      NodeSidebar.jsx                — panel izquierdo tipos de nodo
      NodeConfigPanel.jsx            — panel derecho configuración
      nodes/FlowNode.jsx             — visual de nodo
      nodes/nodeTypes.js             — config tipos
    flow/FlowStep.jsx                — paso individual (cliente)
    kanban/
      KanbanBoard.jsx                — columnas del kanban
      KanbanCard.jsx                 — tarjeta cliente
      InviteClientModal.jsx          — invitar + enviar email + link
    utils/date.js                    — formatDistanceToNow(timestamp)
functions/
  index.js                           — todas las Cloud Functions
  package.json                       — deps: firebase-functions, @google/generative-ai,
                                       pdf-parse, mammoth, resend
```

---

## Firebase / infraestructura

- **Proyecto:** `flowsync-e9709`
- **URL live:** https://flowsync-e9709.web.app
- **Storage bucket:** `gs://flowsync-e9709.firebasestorage.app`
- **Plan:** Blaze (requerido para Functions + Storage)
- **Reglas:** `firestore.rules` + `storage.rules` deployadas
- **Secrets configurados en Secret Manager:**
  - `GEMINI_API_KEY` ✅
  - `RESEND_API_KEY` ✅ (`re_D96Nv3Jh_Dwwny6b9vYiytu8DVWpCrLpK`)

### Colecciones Firestore

| Colección | Campos principales |
|-----------|-------------------|
| `users` | uid, email, displayName, orgId, role, createdAt |
| `organizations` | name, createdAt |
| `workflows` | userId (= orgId del admin), orgId, name, knowledgeBase, knowledgeBaseFiles[], nodes[], edges[], createdAt |
| `executions` | userId, orgId, workflowId, workflowName, clientName, clientEmail, status, currentNodeIndex, completedNodes, totalNodes, responses{}, remindersSent, createdAt, updatedAt |
| `invites` | email, orgId, role, createdBy, createdByName, claimed, expiresAt, createdAt |

### knowledgeBaseFiles (array en workflows)
```js
{
  id: string,           // uuid
  name: string,         // nombre original del archivo
  size: number,
  type: string,         // 'pdf' | 'docx' | 'txt' | 'image'
  mimeType: string,
  storagePath: string,  // ruta en Firebase Storage
  extractedText: string // texto extraído por extractKnowledgeBaseFile
}
```

### Status de executions
`invited` → `in_progress` → `completed`

### Roles
- `admin`: crea flujos, gestiona equipo, ve todo. `orgId = uid` (backward compat)
- `supervisor`: solo ve Clientes y Dashboard. `orgId` del admin que lo invitó

---

## Cloud Functions

| Función | Trigger | Descripción |
|---------|---------|-------------|
| `analyzeFlow` | onCall | Análisis IA con Gemini. Recibe respuestas + knowledgeBase |
| `extractKnowledgeBaseFile` | onCall | Descarga archivo de Storage, extrae texto (pdf-parse/mammoth/Gemini Vision) |
| `sendInviteEmail` | onCall | Envía email de invitación al cliente (Resend) |
| `sendTeamInvite` | onCall | Envía email de invitación al colaborador (Resend) |
| `resendFlowLink` | onCall | Busca ejecuciones pendientes por email y reenvía links |
| `sendReminders` | onSchedule (24h) | Recordatorio diario a clientes con ejecuciones sin completar y remindersSent=0 |

---

## Variables de entorno (.env — NO en git)

```
VITE_FIREBASE_API_KEY=AIzaSyDidR9MdZWW8PXlriKJ-RbFXAoyLF3EeSc
VITE_FIREBASE_AUTH_DOMAIN=flowsync-e9709.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=flowsync-e9709
VITE_FIREBASE_STORAGE_BUCKET=flowsync-e9709.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=798947091656
VITE_FIREBASE_APP_ID=1:798947091656:web:5c6a19564fd200eddcb1fd
```

---

## Comandos de desarrollo

```bash
npm run dev          # servidor local (localhost:5173)
npm run build        # build de producción (output: dist/)
```

## Deploy

```bash
# Build + deploy completo
npm run build
npx firebase-tools deploy --project flowsync-e9709

# Solo functions
npx firebase-tools deploy --only functions --project flowsync-e9709

# Solo hosting
npm run build && npx firebase-tools deploy --only hosting --project flowsync-e9709

# Git
git add -A && git commit -m "mensaje" && git push origin main
```

---

## Estado actual (2026-06-12)

### ✅ Completado
- Login (Google OAuth + email/password)
- Builder visual de flujos (drag-and-drop, 6 tipos de nodos)
- Base de conocimiento: texto manual + upload de PDF/DOCX/TXT/imágenes con extracción automática
- Vista del cliente (`/flow/:id`) con progreso paso a paso y RecoverLinkScreen
- Análisis IA (Gemini): idle → analizando → resultado → continuar
- Kanban de clientes en tiempo real
- Invitación de clientes con link + email (Resend)
- Roles: Admin / Supervisor con rutas protegidas
- Multi-tenant: orgId, TeamPage, JoinPage, claimInvite
- Emails funcionando con Resend (sendInviteEmail, sendTeamInvite, resendFlowLink, sendReminders)
- Recordatorios diarios automatizados (Cloud Scheduler)
- Firestore rules + Storage rules deployadas
- Dashboard con analytics
- Deploy en https://flowsync-e9709.web.app
- Código en https://github.com/jrodrigogonzalezv/flowsync

### 🔜 Pendiente / Ideas futuras
- WhatsApp integration (Twilio) — deferido
- Verificar dominio `system.cl` en Resend para enviar desde `noreply@system.cl`
- Filtros en el Kanban (por flujo, por fecha)
- Exportar respuestas a CSV
- Personalización de emails (logo del cliente)
- Webhooks cuando un cliente termina

---

## Cómo retomar el proyecto

```bash
git clone https://github.com/jrodrigogonzalezv/flowsync.git
cd flowsync
npm install
cd functions && npm install && cd ..
# crear .env en raíz con las variables de arriba
npm run dev
```

---

## Notas técnicas importantes

- `vite.config.js` tiene `'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'` — necesario para Google login popup
- `useAuth.jsx` tiene JSX dentro (no `.js`)
- Los nodos se serializan a objetos planos antes de guardar (sin valores undefined)
- El flujo del cliente sigue edges desde nodo `start`, prefiere `sourceHandle === 'yes'` en condiciones
- Functions usan `defineSecret` — valores inyectados en runtime, no en build time
- `orgId` del admin = su `uid` (backward compat con docs viejos)
- Storage path para KB: `kb/{workflowId}/{fileId}/{filename}`
- Email from: `FlowSync <onboarding@resend.dev>` (dominio sandbox Resend — para producción verificar system.cl)

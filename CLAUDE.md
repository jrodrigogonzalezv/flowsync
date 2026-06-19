# FlowSync — Contexto del Proyecto para Claude

> Léeme antes de hacer cualquier cosa. Este archivo existe para que Claude retome el proyecto sin que el usuario tenga que explicar nada.

---

## Instrucciones para Claude (leer siempre)

1. **No preguntes lo que ya está aquí.** Este archivo es la fuente de verdad del proyecto. Úsalo antes de explorar archivos.
2. **Sé conciso.** Respuestas cortas. Sin resúmenes al final de cada mensaje. Sin comentarios obvios en el código.
3. **Al terminar una sesión con cambios significativos**, actualiza la sección "Estado actual" de este archivo y haz commit+push: `git add CLAUDE.md && git commit -m "docs: actualizar CLAUDE.md" && git push origin main`. Hazlo sin que el usuario lo pida.
4. **Usa `/compact`** si el contexto se acerca al límite (el usuario puede escribir `/compact` en el chat para comprimir sin perder historial).
5. **Lee solo los archivos necesarios.** Prefiere Grep/Glob a leer archivos completos. Solo lee el archivo completo si vas a editarlo.
6. **No regeneres código que ya existe.** Antes de escribir algo, verifica si ya existe con Grep.
7. **Deploy siempre explícito.** Solo hacer `firebase deploy` si el usuario lo pide. Commit+push siempre juntos.

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
| Frontend | React + Vite, Tailwind CSS v4, React Router v7, React Flow (`@xyflow/react` v12.11.0) |
| Auth | Firebase Auth (Google OAuth + email/password) |
| Base de datos | Firestore (onSnapshot real-time) |
| Storage | Firebase Storage (KB docs + fotos de perfil) |
| Backend | Firebase Functions v2 (Node 20, onCall + onSchedule) |
| IA | Google Gemini `gemini-1.5-flash` via `@google/generative-ai` |
| Email | Resend.com (`resend` npm) via Firebase Function |
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
  data/
    workflowTemplates.js             — 10 plantillas predefinidas (nodos+edges listos)
  pages/
    Dashboard.jsx                    — stats, actividad reciente, analytics
    WorkflowsPage.jsx                — lista de flujos (filtra por orgId), botón delete
    WorkflowBuilderPage.jsx          — editor con header + KnowledgeBaseModal + TemplateModal
    ClientsPage.jsx                  — Kanban clientes: archivo/eliminar, selector flujos activos
    ClientFlowPage.jsx               — vista pública del cliente + RecoverLinkScreen + ArchivedScreen
    TeamPage.jsx                     — gestión de miembros e invitaciones (solo admin)
    JoinPage.jsx                     — aceptación de invitación de equipo (/join?invite=ID)
  components/
    layout/AppLayout.jsx             — navbar (adminNav/supervisorNav), badge de rol
    auth/LoginPage.jsx               — login split layout
    kb/KnowledgeBaseModal.jsx        — modal KB: texto manual + upload de archivos
    builder/
      WorkflowBuilder.jsx            — React Flow canvas (onDrop guard start único, onDeleteNode)
      NodeSidebar.jsx                — panel izquierdo tipos de nodo (hasStart → disable Inicio)
      NodeConfigPanel.jsx            — panel derecho config (botón Eliminar, oculto en start)
      TemplateModal.jsx              — selector plantillas: "Flujo en blanco" + grid de plantillas
      nodes/FlowNode.jsx             — visual de nodo
      nodes/nodeTypes.js             — config tipos con bgLight, textColor, border, icon, label
    flow/
      FlowStep.jsx                   — paso individual (cliente)
      ClientProfileForm.jsx          — formulario perfil antes del flujo (foto, RUT, empresa, etc.)
    kanban/
      KanbanBoard.jsx                — columnas del kanban (recibe clientProfiles prop)
      KanbanCard.jsx                 — tarjeta cliente (avatar foto, badge ARCHIVADO, opacidad)
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
- **Repo GitHub:** https://github.com/jrodrigogonzalezv/flowsync
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
| `executions` | userId, orgId, workflowId, workflowName, clientName, clientEmail, status, currentNodeIndex, completedNodes, totalNodes, responses{}, remindersSent, archived (bool), createdAt, updatedAt |
| `invites` | email, orgId, role, createdBy, createdByName, claimed, expiresAt, createdAt |
| `clients` | orgId, email, displayName, type ('natural'\|'juridica'), phone, rut, address, companyName, companyRut, photoURL, createdAt, updatedAt |

### knowledgeBaseFiles (array en workflows)
```js
{ id, name, size, type, mimeType, storagePath, extractedText }
```

### Storage paths
- KB docs: `kb/{workflowId}/{fileId}/{filename}`
- Fotos de perfil clientes: `profiles/clients/{orgId}/{sanitizedEmail}`

### Status de executions
`invited` → `in_progress` → `completed`

### archived en executions
- `archived: true` → link del cliente muestra `ArchivedScreen` (proceso pausado)
- Solo se puede eliminar definitivamente desde el estado archivado

### Roles
- `admin`: crea flujos, gestiona equipo, ve todo. `orgId = uid`
- `supervisor`: solo ve Clientes y Dashboard. `orgId` del admin que lo invitó

---

## Cloud Functions

| Función | Trigger | Descripción |
|---------|---------|-------------|
| `analyzeFlow` | onCall | Análisis IA con Gemini. Recibe respuestas + knowledgeBase |
| `extractKnowledgeBaseFile` | onCall | Descarga archivo de Storage, extrae texto |
| `sendInviteEmail` | onCall | Email de invitación al cliente (Resend) |
| `notifyClient` | onCall | Notificación por email al cliente (con vars `{{clientName}}`, `{{clientEmail}}` sustituidas server-side) |
| `sendTeamInvite` | onCall | Email de invitación al colaborador (Resend) |
| `resendFlowLink` | onCall | Reenvía links a clientes con ejecuciones pendientes |
| `sendReminders` | onSchedule (24h) | Recordatorio diario a clientes con remindersSent=0 |

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
# Solo hosting (más común)
npm run build && npx firebase-tools deploy --only hosting --project flowsync-e9709

# Solo functions
npx firebase-tools deploy --only functions --project flowsync-e9709

# Todo
npm run build && npx firebase-tools deploy --project flowsync-e9709

# Git
git add -A && git commit -m "mensaje" && git push origin main
```

## Clonar en otro equipo

```bash
git clone https://github.com/jrodrigogonzalezv/flowsync.git
cd flowsync
npm install
cd functions && npm install && cd ..
# crear .env en raíz con las variables de arriba
npm run dev
```

---

## Estado actual (2026-06-18 — actualizado sesión 5)

### 🌿 Rama activa: `main`
`feature/world-class-ux` mergeada a `main` ✅ (sesión 5).

### ✅ Completado (sesión 4 + 5 — ya en main)
- Login (Google OAuth + email/password)
- Builder visual de flujos (drag-and-drop, 6 tipos de nodos)
  - Nodo Inicio: no se puede duplicar (guard en onDrop + sidebar disabled)
  - Eliminar nodo: botón en NodeConfigPanel (oculto para start)
- Base de conocimiento: texto manual + upload PDF/DOCX/TXT/imagen con extracción automática
- Plantillas de flujos: 10 plantillas (básico, IA, decisión) + "Flujo en blanco"
  - `TemplateModal` como primer paso al crear flujo nuevo
  - También accesible desde el canvas con botón "Plantillas"
  - `builderKey` en WorkflowBuilderPage fuerza remount de WorkflowBuilder al cambiar plantilla
- Vista del cliente (`/flow/:id`) con progreso paso a paso y RecoverLinkScreen
  - `ArchivedScreen` cuando `execution.archived === true`
  - `ClientProfileForm` si el cliente no tiene perfil (se muestra antes del flujo)
- Perfiles de clientes: foto (Storage), RUT, teléfono, dirección, persona natural/jurídica
- Análisis IA (Gemini): idle → analizando → resultado → continuar
- Kanban de clientes en tiempo real
  - KanbanCard: avatar foto perfil, badge ARCHIVADO, opacidad reducida en archivados
  - clientProfiles pasado desde ClientsPage → KanbanBoard → KanbanCard
- Archivo y eliminación de ejecuciones (ClientsPage):
  - Archivar (reversible): `archived: true` en Firestore, link muestra ArchivedScreen
  - Reactivar: `archived: false`
  - Eliminar definitivo (solo desde archivado): borra documento + muestra confirmación fuerte
- Selector de flujos en Clientes solo muestra flujos **activos** (onSnapshot a `workflows`)
- Invitación de clientes con link + email (Resend)
- Emails con variables `{{clientName}}` y `{{clientEmail}}` sustituidas server-side en `notifyClient`
- Roles: Admin / Supervisor con rutas protegidas
- Multi-tenant: orgId, TeamPage, JoinPage, claimInvite
- Recordatorios diarios automatizados (Cloud Scheduler)
- Dashboard con analytics
- Eliminar flujos desde WorkflowsPage (botones siempre visibles)
- **Nodo "Carga docs"** (tipo `upload`):
  - Cliente sube archivos (PDF/imagen/Word) directamente a Firebase Storage (`client-docs/{orgId}/{executionId}/{nodeId}/`)
  - Al enviar, la ejecución pasa a status `review` automáticamente
  - Cliente ve pantalla "Documentos en revisión" con lista de archivos enviados
  - KanbanCard: badge "N docs para revisar" en columna En revisión
  - Admin ve documentos en modal (links descarga) con:
    - **Aprobar y continuar** → avanza al siguiente nodo (`pendingContinueNodeId`) o completa el flujo
    - **Solicitar más docs** → vuelve al nodo upload (`reviewNodeId`), limpia `uploadedDocs`
  - Execution fields nuevos: `uploadedDocs[]`, `reviewNodeId`, `pendingContinueNodeId`
  - Notificación interna `docs_submitted` al subir documentos
  - Recordatorios de email NO se envían a status `review` (correcto por diseño)
- Deploy en https://flowsync-e9709.web.app

- **Portal cliente + magic link auth** (sesión 3, en `main`):
  - Clientes pueden crear cuenta opcional vía magic link (passwordless email)
  - Banner en `/flow/:id` con botón "Crear cuenta" → envía magic link a `execution.clientEmail`
  - `/portal` — lista todos los flujos asignados al cliente autenticado
  - `ensureUserDoc` en useAuth distingue sign-in de cliente vs admin (localStorage flag `flowsync_client_signin` + pathname `/portal`)
  - Clientes crean doc `users/{uid}` con `role: 'client'` sin organización
  - `PrivateRoute` redirige `role: 'client'` a `/portal`
  - **PENDIENTE**: habilitar "Email link (passwordless sign-in)" en Firebase Console → Authentication → Sign-in method

- **UX world-class** (sesión 4, rama `feature/world-class-ux`):
  - `ClientProfileForm`: nombre completo dividido (firstName / paternalLastName / maternalLastName),
    domicilio estructurado (calle, número, depto, ciudad, región — select 16 regiones de Chile — país),
    fecha de nacimiento, género, nacionalidad. Empresa: razón social + nombre representante (nombre+apellido).
    Guarda campos backward-compatible `name` y `address` + nuevos campos granulares en Firestore `clients`.
  - `FlowNode`: rediseño estilo n8n — barra de color lateral, nodo ~65px alto (vs ~120px anterior),
    sin descripción en canvas (solo en panel de config), pills de opciones para nodos decisión
  - `WorkflowBuilder`: `fitViewOptions={{ maxZoom: 0.85, padding: 0.4 }}` para zoom inicial razonable;
    botón `+` al hover de nodo → `QuickAddPopup` → agrega nodo conectado en posición y+130px;
    sidebar colapsable con botón chevron (muestra íconos en modo colapsado)
  - `NodeSidebar`: acepta props `isOpen`/`onToggle`, íconos emoji en modo colapsado
  - `QuickAddPopup`: nuevo componente `src/components/builder/QuickAddPopup.jsx`
  - `workflowTemplates.js`: posiciones Y comprimidas ~33% (factor 0.66) en los 10 templates

- **Super Admin** (`/superadmin`):
  - Identificado por colección Firestore `superAdmins/{email}` (solo lectura desde cliente)
  - `isSuperAdmin` en contexto de auth (`useAuth`)
  - `SuperAdminRoute` en App.jsx — redirige a `/dashboard` si no es superadmin
  - Badge "Super Admin" (púrpura) en navbar, link "Super Admin" como primer item del nav
  - `/superadmin`: tabla de todas las orgs con stats (total, activas, trial, inactivas), admin email, supervisores, flujos, clientes, badge de plan
  - `/superadmin/org/:orgId`: detalle de org — control de suscripción (trial/active/inactive/free + nota interna), admin, supervisores, flujos, clientes recientes (30)
  - `organizations/{orgId}` tiene campos: `plan`, `planSince`, `planNote`
  - Firestore rules: `isSuperAdmin()` permite leer todas las colecciones + update de organizations
  - `SuperAdminLayout` con nav completo: Dashboard, Organizaciones, Buscar, Configuración (acento púrpura)
  - Layout super admin completamente separado del app layout; rutas bajo `/superadmin/*`
  - `SADashboard`: MRR real (sum de prices[plan] de saasSettings), señales de churn (sin flujos, sin clientes, trial expirando, inactivos 30d+), nuevas orgs del mes
  - `SASearch`: búsqueda global de usuarios y organizaciones por nombre/email
  - `SASettings`: precios por plan, moneda (USD/CLP/EUR), días trial, preview MRR en vivo. Lee/escribe `config/saasSettings`
  - `OrgDetailPage` mejorado:
    - Bloqueo/desbloqueo de orgs: botón "Suspender"/"Desbloquear" + diálogo confirmación + banner rojo cuando está bloqueada
    - `orgBlocked` en useAuth → muestra `BlockedScreen` a usuarios de orgs bloqueadas
    - Historial de notas internas: input + botón Agregar, guarda con `arrayUnion` en `organizations.notes[]` (formato `{text, by, at}`)
    - Modal "Email al admin": llama a Cloud Function `emailOrgAdmin`
    - Back nav corregido a `/superadmin/orgs`
  - `emailOrgAdmin`: nueva Cloud Function onCall, envía email al admin de una org usando Resend
  - `firestore.rules`: regla `config` collection (solo superadmin puede leer/escribir)
  - `firestore.indexes.json`: índices compuestos para `executions(orgId+createdAt)` y `workflows(orgId+createdAt)`
  - `superAdmins/{email}` en Firestore: doc de lectura del cliente para detectar superadmin al login
  - Documento `superAdmins/rodrigo@system.cl` creado vía REST API con gcloud auth token

- **WhatsApp via Twilio Sandbox:**
  - Campo teléfono opcional en `InviteClientModal` (prefijo +56 automático)
  - Cloud Function `sendWhatsappInvite` con secrets `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`
  - Sandbox number: `whatsapp:+14155238886` · Join code: `join 250562`
  - Credenciales Twilio: SID y Auth Token guardados en Firebase Secret Manager (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  - Para producción: cambiar el número en `functions/index.js` por número propio aprobado por Meta
  - Requisito sandbox: el cliente debe enviar `join 250562` a `+14155238886` una vez antes de recibir mensajes
  - Bugs corregidos (2026-06-17):
    - Input teléfono ya no duplicaba prefijo `+56` al escribir
    - Modal no se cerraba prematuramente antes de mostrar estado email/WhatsApp
    - Spinner visible mientras se envía la invitación
    - Modal se cierra automáticamente a los 2.5s para que el Kanban quede visible
    - Filtros del Kanban se limpian al abrir InviteClientModal
    - `sendWhatsappInvite` usa `process.env` (secret latest version) + logs para debug

### 🔜 Pendiente / Ideas futuras
- Habilitar "Email link (passwordless sign-in)" en Firebase Console para que magic link funcione
- Verificar dominio `system.cl` en Resend (actualmente envía desde `onboarding@resend.dev`)
- WhatsApp integration (Twilio) — deferido
- Filtros en el Kanban (por flujo, por fecha)
- Exportar respuestas a CSV
- Personalización de emails (logo del cliente)
- Webhooks cuando un cliente termina

---

## Notas técnicas importantes

- `vite.config.js` tiene `'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'` — necesario para Google login popup
- `useAuth.jsx` tiene JSX dentro (no `.js`)
- Los nodos se serializan a objetos planos antes de guardar (sin valores undefined)
- El flujo del cliente sigue edges desde nodo `start`, prefiere `sourceHandle === 'yes'` en condiciones
- Functions usan `defineSecret` — valores inyectados en runtime, no en build time
- `orgId` del admin = su `uid` (backward compat con docs viejos)
- PowerShell: usar `@'...'@` here-strings (no `<<EOF`) para commits con mensajes multilínea
- `builderKey` en WorkflowBuilderPage: se incrementa al seleccionar plantilla para forzar remount de WorkflowBuilder y que `useNodesState` se reinicialice con los nuevos nodos
- Perfiles de clientes: por email (no por ejecución), persisten entre flujos del mismo org
- `clients` Firestore: escritura pública (no autenticada) para que clientes puedan guardar perfil
- `notifyClient`: sustituye `{{clientName}}` y `{{clientEmail}}` antes de llamar a `buildEmailHtml`

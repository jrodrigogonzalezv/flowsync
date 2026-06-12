# FlowSync — Contexto del Proyecto para Claude

> Léeme antes de hacer cualquier cosa. Este archivo existe para que Claude retome el proyecto sin que el usuario tenga que explicar nada.

---

## ¿Qué es FlowSync?

SaaS de automatización de flujos con IA. Permite:
- Crear flujos visuales (drag-and-drop estilo n8n) con nodos: Inicio, Formulario, Análisis IA, Condición, Notificación, Fin
- Enviar un link a clientes para que completen el flujo paso a paso
- La IA (Gemini) analiza las respuestas del cliente contra una base de conocimiento
- Kanban en tiempo real que muestra el progreso de cada cliente

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite, Tailwind CSS v4, React Router v7, React Flow (`@xyflow/react`) |
| Auth | Firebase Auth (Google OAuth + email/password) |
| Base de datos | Firestore (onSnapshot real-time) |
| Backend | Firebase Functions v2 (Node 20) |
| IA | Google Gemini `gemini-1.5-flash` via `@google/generative-ai` |
| Email | nodemailer (Gmail SMTP) via Firebase Function |
| Hosting | Firebase Hosting |
| Icons | Lucide React |

---

## Diseño / tema

Light profesional: fondos `bg-slate-50`/white, acento `blue-800`, texto slate.  
**No usar colores oscuros** (gray-900, gray-950, text-white sobre fondo oscuro). Todo debe verse como un SaaS profesional claro.

---

## Estructura de archivos clave

```
src/
  lib/firebase.js              — inicialización Firebase, exports: auth, db, storage
  hooks/useAuth.jsx            — contexto de auth (Google + email/password)
  App.jsx                      — rutas: /login, /flow/:id (públicas), resto privadas
  index.css                    — solo reset básico (@import "tailwindcss")
  pages/
    Dashboard.jsx              — stats, actividad reciente, analytics
    WorkflowsPage.jsx          — lista de flujos con cards
    WorkflowBuilderPage.jsx    — editor con header, knowledge base modal
    ClientsPage.jsx            — Kanban de clientes
    ClientFlowPage.jsx         — vista pública del cliente (completa el flujo)
  components/
    layout/AppLayout.jsx       — navbar sticky + layout principal
    auth/LoginPage.jsx         — login split layout (panel azul + formulario)
    builder/
      WorkflowBuilder.jsx      — React Flow canvas
      NodeSidebar.jsx          — panel izquierdo con tipos de nodos
      NodeConfigPanel.jsx      — panel derecho de configuración del nodo
      nodes/FlowNode.jsx       — componente visual de cada nodo
      nodes/nodeTypes.js       — config de tipos (colores, íconos, handles)
    flow/FlowStep.jsx          — paso individual que ve el cliente
    kanban/
      KanbanBoard.jsx          — columnas del kanban
      KanbanCard.jsx           — tarjeta de cliente
      InviteClientModal.jsx    — modal para invitar + enviar email
    utils/date.js              — formatDistanceToNow(timestamp)
functions/
  index.js                     — analyzeFlow (Gemini) + sendInviteEmail (nodemailer)
  package.json                 — deps: firebase-functions, @google/generative-ai, nodemailer
```

---

## Firebase / infraestructura

- **Proyecto:** `flowsync-e9709`
- **URL live:** https://flowsync-e9709.web.app
- **Reglas Firestore:** `allow read, write: if request.auth != null`
- **Secrets configurados:** `GEMINI_API_KEY` ✅
- **Secrets pendientes:** `GMAIL_USER`, `GMAIL_PASS` ❌ (ver sección de email)

### Colecciones Firestore

| Colección | Campos principales |
|-----------|-------------------|
| `users` | uid, email, displayName, createdAt |
| `workflows` | userId, name, knowledgeBase, nodes[], edges[], createdAt |
| `executions` | userId, workflowId, workflowName, clientName, clientEmail, status, currentNodeIndex, completedNodes, totalNodes, responses{}, createdAt, updatedAt |

### Status de executions
`invited` → `in_progress` → `completed`

---

## Variables de entorno (.env — NO en git)

Crea un archivo `.env` en la raíz con las siguientes variables.
Los valores los encuentras en: https://console.firebase.google.com/project/flowsync-e9709/settings/general

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=flowsync-e9709.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=flowsync-e9709
VITE_FIREBASE_STORAGE_BUCKET=flowsync-e9709.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Comandos de desarrollo

```bash
npm run dev          # servidor local
npm run build        # build de producción (output: dist/)
```

---

## Deploy

```bash
# Build + deploy hosting
npm run build
firebase deploy --only hosting --project flowsync-e9709

# Deploy solo functions
firebase deploy --only functions --project flowsync-e9709

# Push a GitHub (autenticar con: firebase login / gh auth login)
git push origin main
```

> Nota: si el terminal no tiene sesión activa de Firebase, usa `firebase login` o pasa el token CI
> con `--token "..."` (el token lo genera `firebase login:ci` en una sesión con navegador).

---

## Estado actual (2026-06-12)

### ✅ Completado
- Login (Google OAuth + email/password)
- Builder visual de flujos (drag-and-drop, 6 tipos de nodos)
- Base de conocimiento por flujo (knowledge base modal)
- Vista del cliente (`/flow/:id`) con progreso paso a paso
- Análisis IA (Gemini): idle → analizando → resultado → continuar
- Kanban de clientes en tiempo real (4 columnas)
- Invitación de clientes con link compartible
- Función `sendInviteEmail` escrita (nodemailer, HTML bonito)
- Dashboard con analytics: tasa completado, barra de progreso, alertas, stats por flujo
- Tema light profesional completo en TODOS los componentes
- Build sin errores
- Deploy en https://flowsync-e9709.web.app
- Código en https://github.com/jrodrigogonzalezv/flowsync

### ❌ Pendiente

#### 1. Habilitar envío de emails (requiere intervención del usuario)
```bash
# 1. Confirmar plan Blaze activo:
#    https://console.firebase.google.com/project/flowsync-e9709/usage/details

# 2. Configurar secrets de Gmail (usar App Password, no contraseña normal):
firebase functions:secrets:set GMAIL_USER   # ej: tucuenta@gmail.com
firebase functions:secrets:set GMAIL_PASS   # App Password de Google

# 3. Deploy de functions:
firebase deploy --only functions --project flowsync-e9709 --token "..."
```
El modal de invitación ya llama a la función — cuando los secrets estén configurados, el email se envía automáticamente. Si no están, degrada gracefully y siempre muestra el link.

#### 2. Mejoras futuras (ideas)
- Notificación por email cuando el cliente completa el flujo
- Filtros en el Kanban (por flujo, por fecha)
- Exportar respuestas a CSV
- Personalización de emails (logo, colores del cliente)
- Autenticación de clientes (actualmente el link es público)
- Webhooks cuando un cliente termina un flujo

---

## Cómo retomar el proyecto

1. Clona el repo si es una máquina nueva:
   ```bash
   git clone https://github.com/jrodrigogonzalezv/flowsync.git
   cd flowsync
   npm install
   cd functions && npm install && cd ..
   ```

2. Crea el `.env` en la raíz con las variables de arriba.

3. `npm run dev` para abrir en `localhost:5173`.

4. Dale este archivo a Claude (está en la raíz del proyecto como `CLAUDE.md`) — Claude lo leerá automáticamente.

---

## Notas técnicas importantes

- `vite.config.js` tiene `'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'` — necesario para el popup de Google login
- `useAuth.jsx` (no `.js`) — tiene JSX dentro
- Los nodos se serializan a objetos planos antes de guardar en Firestore (sin valores undefined)
- El flujo del cliente sigue edges desde el nodo `start`, prefiere `sourceHandle === 'yes'` en condiciones
- Las Functions usan `defineSecret` — los valores se inyectan en runtime, no en build time

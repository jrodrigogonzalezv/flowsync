# FlowSync — Cómo funciona el sistema

## Los 3 actores

| Actor | Cómo entra | Qué puede hacer |
|---|---|---|
| **Super Admin** | `/login` (cuenta en `superAdmins/{email}`) | Gestionar organizaciones, ver MRR, bloquear cuentas, configurar precios de planes |
| **Admin** | `/login` (cuenta normal, `role: 'admin'`) | Crear flujos, invitar clientes, revisar documentos, evaluar con IA, gestionar equipo |
| **Operador** | `/login` (cuenta normal, `role: 'member'`) | Ver clientes y chatear con soporte — no puede crear flujos ni acceder a configuración |
| **Cliente** | Link por email (sin cuenta Firebase) | Llenar el formulario del flujo, subir documentos |

---

## Ciclo de vida de un proceso

```
1. Admin crea un FLUJO (workflow con nodos encadenados)
2. Admin invita al cliente → se crea una "ejecución" y se envía un email con el link
3. Cliente abre el link → llena el flujo paso a paso
4. Según los nodos del flujo:
   a) Sin nodo de carga de docs → al terminar queda COMPLETADO
   b) Con nodo de carga de docs → al subir los archivos queda EN REVISIÓN
5. Admin revisa, evalúa con IA si quiere, y decide:
   - Aprobar y continuar el flujo
   - Solicitar más documentos (vuelve al paso de subida)
   - Archivar (pausa el proceso)
```

---

## Los nodos que puede tener un flujo

| Nodo | Qué ve el cliente | Efecto |
|---|---|---|
| **Formulario** | Campos a rellenar (texto, select, fecha, etc.) | Guarda las respuestas |
| **Condición** | Botones Sí / No | Bifurca el flujo según la respuesta |
| **Decisión** | Lista de opciones | Bifurca el flujo según la opción elegida |
| **Notificación** | Nada (es silencioso) | Envía un email automático al cliente |
| **IA (cliente)** | Pantalla de análisis con resultado | La IA analiza las respuestas acumuladas y muestra feedback al cliente |
| **Carga de docs** | Uploader de archivos | Al subir, el proceso pasa a estado "En revisión" y el cliente ve pantalla de espera |

---

## Estados de una ejecución (Kanban)

| Estado | Qué significa |
|---|---|
| `invited` | El cliente recibió el link pero no ha empezado |
| `in_progress` | El cliente está llenando el flujo |
| `review` | El cliente subió documentos — el admin debe actuar |
| `completed` | El proceso terminó |
| `archived` | El admin lo pausó/archivó |

---

## Evaluación con IA — dos modos

### Modo 1: IA en el flujo del cliente
- El admin pone un nodo IA en el flujo
- Cuando el cliente llega a ese nodo, la IA analiza las respuestas anteriores y muestra un resultado en pantalla
- Útil para: pre-screening instantáneo, feedback inmediato

### Modo 2: IA desde el panel del admin (lo que implementamos para arriendo)
- El cliente sube documentos → queda en "En revisión"
- El admin abre la tarjeta del cliente en `/clients`
- Hace clic en **"Evaluar con IA"**
- La IA analiza las respuestas del formulario + usa la knowledge base del workflow
- El admin ve el análisis y decide si aprobar o pedir más documentos
- Útil para: solicitudes de arriendo, crédito, postulaciones

---

## Dónde vive cada cosa en la app

```
/login                  → entrada para Admin, Operador y Super Admin
/dashboard              → resumen de actividad (Admin)
/workflows              → crear y editar flujos (Admin)
/workflows/:id          → editor visual del flujo (Admin)
/clients                → Kanban con todas las ejecuciones (Admin/Operador)
/team                   → gestión de miembros del equipo (Admin)
/analytics              → métricas de flujos (Admin)
/settings               → configuración de la organización (Admin)
/profile                → perfil del usuario (todos)
/flow/:id               → el formulario que ve el CLIENTE (sin login)
/join                   → página para aceptar una invitación de equipo
/superadmin/dashboard   → métricas globales: MRR, orgs, churn (Super Admin)
/superadmin/orgs        → listado de todas las organizaciones (Super Admin)
/superadmin/search      → buscar usuarios o ejecuciones (Super Admin)
/superadmin/settings    → precios de planes (Super Admin)
```

---

## Stack técnico

- **Frontend**: React + Vite + Tailwind CSS v4
- **Auth**: Firebase Auth (Google + email/password)
- **Base de datos**: Firestore
- **Archivos**: Firebase Storage
- **Funciones**: Firebase Functions v2 (Gen 2) sobre Cloud Run
- **IA**: Gemini (vía Cloud Secret `GEMINI_API_KEY`)
- **Email**: Resend (vía Cloud Secret `RESEND_API_KEY`)

### Funciones en Cloud

| Función | Caller | Descripción |
|---|---|---|
| `analyzeFlow` | Cliente (sin auth) y Admin | Análisis IA de respuestas con Gemini |
| `notifyClient` | Cliente (sin auth) | Envío de email automático al cliente |
| `resendFlowLink` | Cliente (sin auth) | Reenvía links de procesos pendientes por email |
| `extractKnowledgeBaseFile` | Admin (autenticado) | Extrae texto de archivos PDF/Word para la KB |
| `sendInviteEmail` | Admin (autenticado) | Envía el link del flujo al cliente |
| `sendTeamInvite` | Admin (autenticado) | Invita a un miembro al equipo |
| `emailOrgAdmin` | Admin (autenticado) | Notifica al admin de la organización |

> Las primeras 3 tienen `invoker: 'public'` porque son llamadas por usuarios sin sesión Firebase.
> Las demás requieren autenticación Firebase.

---

## Colecciones Firestore principales

| Colección | Qué guarda |
|---|---|
| `organizations/{orgId}` | Datos de la empresa (nombre, plan, `blocked`) |
| `users/{uid}` | Perfil del usuario (`orgId`, `role`, `email`) |
| `superAdmins/{email}` | Documento vacío que marca a alguien como super admin |
| `workflows/{id}` | Definición del flujo (nodos, edges, knowledge base) |
| `executions/{id}` | Una instancia de un cliente pasando por un flujo |
| `executions/{id}/messages` | Chat de soporte entre operador y cliente |
| `clients/{id}` | Perfil del cliente (RUT, teléfono, dirección, etc.) |
| `invites/{id}` | Invitaciones de equipo pendientes |
| `config/saasSettings` | Precios de planes y configuración global |

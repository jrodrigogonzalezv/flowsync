const E = { animated: true, style: { stroke: '#1e40af', strokeWidth: 2 } }
const edge = (id, source, target, sourceHandle) => ({
  id, source, target, ...E, ...(sourceHandle ? { sourceHandle } : {})
})

export const WORKFLOW_TEMPLATES = [
  // ── 1. Onboarding de cliente ──────────────────────────────────────────────
  {
    id: 'onboarding',
    name: 'Onboarding de cliente',
    description: 'Recolecta datos básicos del nuevo cliente y le da la bienvenida con un email automático.',
    icon: '🎉',
    category: 'básico',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 320, y: 50 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 320, y: 200 },
        data: {
          label: 'Datos del cliente',
          description: 'Necesitamos algunos datos básicos para comenzar tu proceso.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Tu nombre completo' },
            { id: 'f2', label: 'Empresa u organización', type: 'text', required: false, placeholder: 'Nombre de tu empresa' },
            { id: 'f3', label: 'Teléfono', type: 'phone', required: false, placeholder: '+56 9 xxxx xxxx' },
            { id: 'f4', label: '¿Cómo nos conociste?', type: 'select', required: false, options: ['Redes sociales', 'Referido', 'Google', 'Otro'] },
          ],
        },
      },
      {
        id: 'notification-1', type: 'notification', position: { x: 320, y: 400 },
        data: {
          label: 'Email de bienvenida',
          subject: 'Bienvenido/a, {{clientName}}',
          message: 'Hola {{clientName}},\n\nGracias por completar tu registro. Hemos recibido toda tu información y un miembro de nuestro equipo se pondrá en contacto contigo a la brevedad.\n\n¡Estamos muy contentos de tenerte con nosotros!',
        },
      },
      { id: 'end-1', type: 'end', position: { x: 320, y: 570 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'notification-1'),
      edge('e3', 'notification-1', 'end-1'),
    ],
  },

  // ── 2. Calificación de leads ───────────────────────────────────────────────
  {
    id: 'lead-qualification',
    name: 'Calificación de leads',
    description: 'Evalúa automáticamente con IA si un prospecto califica y deriva por camino diferente según el resultado.',
    icon: '🎯',
    category: 'IA',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 350, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 350, y: 190 },
        data: {
          label: 'Información del prospecto',
          description: 'Cuéntanos sobre tu situación para evaluar cómo podemos ayudarte.',
          fields: [
            { id: 'f1', label: '¿Cuál es tu necesidad principal?', type: 'textarea', required: true, placeholder: 'Describe brevemente qué problema quieres resolver...' },
            { id: 'f2', label: 'Presupuesto disponible', type: 'select', required: true, options: ['Menos de $500.000', '$500.000 - $2.000.000', '$2.000.000 - $5.000.000', 'Más de $5.000.000'] },
            { id: 'f3', label: '¿En cuánto tiempo necesitas la solución?', type: 'select', required: false, options: ['De inmediato', 'En 1-3 meses', 'En 3-6 meses', 'Sin urgencia'] },
            { id: 'f4', label: '¿Tienes equipo técnico interno?', type: 'select', required: false, options: ['Sí', 'No', 'Parcialmente'] },
          ],
        },
      },
      {
        id: 'ai-1', type: 'ai', position: { x: 350, y: 400 },
        data: {
          label: 'Análisis de calificación',
          aiPrompt: 'Eres un especialista en calificación de leads. Analiza las respuestas del prospecto y determina si califica para continuar el proceso comercial. Considera el presupuesto, la urgencia y la necesidad. Sé conciso y directo en tu evaluación.',
        },
      },
      {
        id: 'condition-1', type: 'condition', position: { x: 350, y: 570 },
        data: { label: '¿Califica como lead?', condition: 'El prospecto tiene presupuesto suficiente, necesidad clara y urgencia razonable.' },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 120, y: 750 },
        data: {
          label: 'Lead calificado',
          subject: '¡Buenas noticias, {{clientName}}!',
          message: 'Hola {{clientName}},\n\nHemos revisado tu información y nos encantaría tener una reunión contigo. Un ejecutivo te contactará en las próximas 24 horas para coordinar una llamada de diagnóstico gratuita.',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 580, y: 750 },
        data: {
          label: 'Lead no calificado',
          subject: 'Gracias por tu interés, {{clientName}}',
          message: 'Hola {{clientName}},\n\nAgradecemos tu interés. Por el momento nuestros servicios no se ajustan a tu situación actual, pero guardaremos tu información y te contactaremos cuando tengamos algo que se adapte mejor a tus necesidades.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 120, y: 920 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 580, y: 920 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'ai-1'),
      edge('e3', 'ai-1', 'condition-1'),
      edge('e4', 'condition-1', 'notification-2', 'yes'),
      edge('e5', 'condition-1', 'notification-3', 'no'),
      edge('e6', 'notification-2', 'end-2'),
      edge('e7', 'notification-3', 'end-3'),
    ],
  },

  // ── 3. Postulación a cargo ─────────────────────────────────────────────────
  {
    id: 'job-application',
    name: 'Postulación a cargo',
    description: 'Proceso de aplicación laboral con recolección de datos, análisis IA del perfil y notificación del resultado.',
    icon: '💼',
    category: 'IA',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 350, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 350, y: 190 },
        data: {
          label: 'Datos personales',
          description: 'Cuéntanos sobre ti para comenzar el proceso de postulación.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Tu nombre' },
            { id: 'f2', label: 'Email', type: 'email', required: true, placeholder: 'tu@email.com' },
            { id: 'f3', label: 'Teléfono', type: 'phone', required: false },
            { id: 'f4', label: 'Años de experiencia en el área', type: 'number', required: true },
            { id: 'f5', label: 'Nivel de estudios', type: 'select', required: true, options: ['Técnico', 'Universitario', 'Postgrado', 'Doctorado'] },
          ],
        },
      },
      {
        id: 'form-2', type: 'form', position: { x: 350, y: 420 },
        data: {
          label: 'Preguntas del cargo',
          description: 'Responde estas preguntas para que podamos conocerte mejor.',
          fields: [
            { id: 'f6', label: '¿Por qué quieres trabajar con nosotros?', type: 'textarea', required: true },
            { id: 'f7', label: 'Describe tu mayor logro profesional', type: 'textarea', required: true },
            { id: 'f8', label: 'Expectativa de renta mensual', type: 'select', required: false, options: ['$500.000 - $800.000', '$800.000 - $1.200.000', '$1.200.000 - $2.000.000', 'Más de $2.000.000'] },
            { id: 'f9', label: 'Disponibilidad para comenzar', type: 'select', required: true, options: ['Inmediata', '15 días', '30 días', 'Más de 30 días'] },
          ],
        },
      },
      {
        id: 'ai-1', type: 'ai', position: { x: 350, y: 650 },
        data: {
          label: 'Análisis del perfil',
          aiPrompt: 'Eres un especialista en reclutamiento. Analiza el perfil del postulante considerando su experiencia, motivación, logros y disponibilidad. Evalúa si cumple con los requisitos del cargo según la base de conocimiento. Proporciona una evaluación objetiva y constructiva.',
        },
      },
      {
        id: 'condition-1', type: 'condition', position: { x: 350, y: 820 },
        data: { label: '¿Avanza al proceso?', condition: 'El postulante cumple los requisitos mínimos de experiencia y motivación.' },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 120, y: 1000 },
        data: {
          label: 'Avanza a entrevista',
          subject: '¡Avanzaste al siguiente paso, {{clientName}}!',
          message: 'Hola {{clientName}},\n\nFelicitaciones, tu perfil ha sido seleccionado para continuar el proceso. Nos pondremos en contacto contigo para coordinar una entrevista. ¡Prepárate!',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 580, y: 1000 },
        data: {
          label: 'No avanza',
          subject: 'Gracias por postular, {{clientName}}',
          message: 'Hola {{clientName}},\n\nAgradecemos tu tiempo e interés. En esta oportunidad tu perfil no se ajusta a lo que buscamos, pero guardaremos tu información para futuras oportunidades.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 120, y: 1150 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 580, y: 1150 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'form-2'),
      edge('e3', 'form-2', 'ai-1'),
      edge('e4', 'ai-1', 'condition-1'),
      edge('e5', 'condition-1', 'notification-2', 'yes'),
      edge('e6', 'condition-1', 'notification-3', 'no'),
      edge('e7', 'notification-2', 'end-2'),
      edge('e8', 'notification-3', 'end-3'),
    ],
  },

  // ── 4. Encuesta de satisfacción ────────────────────────────────────────────
  {
    id: 'satisfaction-survey',
    name: 'Encuesta de satisfacción',
    description: 'Mide la satisfacción del cliente y actúa automáticamente para fidelizar o recuperar según el resultado.',
    icon: '⭐',
    category: 'básico',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 350, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 350, y: 190 },
        data: {
          label: 'Encuesta de satisfacción',
          description: 'Tu opinión es muy importante para nosotros. Esta encuesta solo toma 2 minutos.',
          fields: [
            { id: 'f1', label: '¿Cuán satisfecho estás con nuestro servicio?', type: 'scale', required: true, max: 10, style: 'numbers', labels: { 1: 'Muy insatisfecho', 10: 'Muy satisfecho' } },
            { id: 'f2', label: '¿Recomendarías nuestros servicios a alguien?', type: 'select', required: true, options: ['Definitivamente sí', 'Probablemente sí', 'No estoy seguro', 'Probablemente no', 'Definitivamente no'] },
            { id: 'f3', label: '¿Qué fue lo que más valoraste?', type: 'textarea', required: false, placeholder: 'Cuéntanos qué te gustó...' },
            { id: 'f4', label: '¿Qué podríamos mejorar?', type: 'textarea', required: false, placeholder: 'Tu opinión nos ayuda a crecer...' },
          ],
        },
      },
      {
        id: 'ai-1', type: 'ai', position: { x: 350, y: 400 },
        data: {
          label: 'Análisis de satisfacción',
          aiPrompt: 'Analiza las respuestas de la encuesta de satisfacción. Evalúa si el cliente está satisfecho o insatisfecho basándote en el puntaje (7+ = satisfecho), si recomendaría el servicio y sus comentarios. Resume los puntos clave de su experiencia.',
        },
      },
      {
        id: 'condition-1', type: 'condition', position: { x: 350, y: 570 },
        data: { label: '¿Cliente satisfecho?', condition: 'El cliente tiene un puntaje de satisfacción de 7 o más y recomendaría el servicio.' },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 120, y: 750 },
        data: {
          label: 'Gracias y fidelización',
          subject: '¡Gracias por tu valoración, {{clientName}}!',
          message: 'Hola {{clientName}},\n\nNos alegra mucho saber que estás satisfecho con nuestro servicio. Tu opinión positiva es nuestro mayor reconocimiento. ¡Nos vemos pronto!',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 580, y: 750 },
        data: {
          label: 'Recuperación de cliente',
          subject: 'Queremos mejorar tu experiencia, {{clientName}}',
          message: 'Hola {{clientName}},\n\nNos preocupa no haber cumplido tus expectativas. Un ejecutivo de cuenta se pondrá en contacto contigo a la brevedad para entender tu situación y buscar una solución.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 120, y: 920 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 580, y: 920 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'ai-1'),
      edge('e3', 'ai-1', 'condition-1'),
      edge('e4', 'condition-1', 'notification-2', 'yes'),
      edge('e5', 'condition-1', 'notification-3', 'no'),
      edge('e6', 'notification-2', 'end-2'),
      edge('e7', 'notification-3', 'end-3'),
    ],
  },

  // ── 5. Selección de servicio / plan ───────────────────────────────────────
  {
    id: 'service-selection',
    name: 'Selección de plan o servicio',
    description: 'El cliente elige entre distintos planes y recibe información personalizada según su elección.',
    icon: '🔀',
    category: 'decisión',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 400, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 400, y: 190 },
        data: {
          label: 'Información de contacto',
          description: 'Antes de elegir tu plan, necesitamos algunos datos.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'Email', type: 'email', required: true },
            { id: 'f3', label: 'Empresa', type: 'text', required: false },
            { id: 'f4', label: 'Tamaño del equipo', type: 'select', required: false, options: ['Solo yo', '2-5 personas', '6-20 personas', 'Más de 20 personas'] },
          ],
        },
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 400, y: 400 },
        data: {
          label: '¿Qué plan te interesa?',
          description: 'Elige el plan que mejor se adapta a tus necesidades.',
          options: [
            { id: 'opt-1', label: 'Plan Básico' },
            { id: 'opt-2', label: 'Plan Profesional' },
            { id: 'opt-3', label: 'Plan Enterprise' },
          ],
        },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 100, y: 610 },
        data: {
          label: 'Info Plan Básico',
          subject: 'Detalles del Plan Básico — {{clientName}}',
          message: 'Hola {{clientName}},\n\nGracias por tu interés en el Plan Básico. Incluye: hasta 3 usuarios, 5 flujos activos, soporte por email. Precio: $29.990/mes.\n\nUn ejecutivo te contactará para los detalles del contrato.',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 400, y: 610 },
        data: {
          label: 'Info Plan Profesional',
          subject: 'Detalles del Plan Profesional — {{clientName}}',
          message: 'Hola {{clientName}},\n\nGracias por tu interés en el Plan Profesional. Incluye: hasta 10 usuarios, flujos ilimitados, IA incluida, soporte prioritario. Precio: $79.990/mes.\n\nUn ejecutivo coordinará una demo contigo.',
        },
      },
      {
        id: 'notification-4', type: 'notification', position: { x: 700, y: 610 },
        data: {
          label: 'Info Plan Enterprise',
          subject: 'Detalles del Plan Enterprise — {{clientName}}',
          message: 'Hola {{clientName}},\n\nGracias por tu interés en el Plan Enterprise. Incluye: usuarios ilimitados, integración API, SLA garantizado, gestor de cuenta dedicado. Precio a medida.\n\nUn ejecutivo senior te contactará en menos de 24 horas.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 100, y: 780 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 400, y: 780 }, data: { label: 'Fin' } },
      { id: 'end-4', type: 'end', position: { x: 700, y: 780 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'decision-1'),
      edge('e3', 'decision-1', 'notification-2', 'opt-1'),
      edge('e4', 'decision-1', 'notification-3', 'opt-2'),
      edge('e5', 'decision-1', 'notification-4', 'opt-3'),
      edge('e6', 'notification-2', 'end-2'),
      edge('e7', 'notification-3', 'end-3'),
      edge('e8', 'notification-4', 'end-4'),
    ],
  },

  // ── 6. Solicitud de crédito ────────────────────────────────────────────────
  {
    id: 'credit-request',
    name: 'Solicitud de crédito',
    description: 'Evalúa automáticamente con IA la capacidad de pago del solicitante y deriva según el resultado.',
    icon: '💳',
    category: 'IA',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 350, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 350, y: 190 },
        data: {
          label: 'Datos personales',
          description: 'Necesitamos verificar tu identidad antes de continuar.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'RUT', type: 'text', required: true, placeholder: '12.345.678-9' },
            { id: 'f3', label: 'Email', type: 'email', required: true },
            { id: 'f4', label: 'Teléfono', type: 'phone', required: true },
            { id: 'f5', label: 'Fecha de nacimiento', type: 'date', required: true },
          ],
        },
      },
      {
        id: 'form-2', type: 'form', position: { x: 350, y: 410 },
        data: {
          label: 'Información financiera',
          description: 'Cuéntanos sobre tu situación económica actual.',
          fields: [
            { id: 'f6', label: 'Renta mensual líquida', type: 'select', required: true, options: ['Menos de $500.000', '$500.000 - $1.000.000', '$1.000.000 - $2.000.000', '$2.000.000 - $3.500.000', 'Más de $3.500.000'] },
            { id: 'f7', label: 'Tipo de contrato', type: 'select', required: true, options: ['Indefinido', 'Plazo fijo', 'Honorarios', 'Independiente', 'Sin contrato'] },
            { id: 'f8', label: 'Antigüedad laboral', type: 'select', required: true, options: ['Menos de 6 meses', '6 a 12 meses', '1 a 3 años', 'Más de 3 años'] },
            { id: 'f9', label: 'Deudas vigentes', type: 'select', required: true, options: ['Sin deudas', 'Menos del 20% de mi renta', '20% a 40% de mi renta', 'Más del 40% de mi renta'] },
            { id: 'f10', label: 'Monto solicitado', type: 'select', required: true, options: ['Hasta $1.000.000', '$1.000.000 - $5.000.000', '$5.000.000 - $15.000.000', 'Más de $15.000.000'] },
          ],
        },
      },
      {
        id: 'ai-1', type: 'ai', position: { x: 350, y: 640 },
        data: {
          label: 'Análisis crediticio',
          aiPrompt: 'Eres un analista de crédito. Evalúa la solicitud basándote en: renta mensual, tipo y antigüedad de contrato, nivel de endeudamiento actual y monto solicitado. Una relación cuota/ingreso menor al 30% es saludable. Emite una recomendación clara de aprobación, aprobación condicional o rechazo, con justificación breve.',
        },
      },
      {
        id: 'condition-1', type: 'condition', position: { x: 350, y: 810 },
        data: { label: '¿Aprobado?', condition: 'El solicitante cumple los requisitos mínimos de capacidad de pago y estabilidad laboral.' },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 120, y: 990 },
        data: {
          label: 'Crédito pre-aprobado',
          subject: '¡Tu crédito está pre-aprobado, {{clientName}}!',
          message: 'Hola {{clientName}},\n\nBuenas noticias: tu solicitud de crédito ha sido pre-aprobada. Un ejecutivo se pondrá en contacto contigo en las próximas 24 horas para finalizar el proceso y coordinar la firma de documentos.',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 580, y: 990 },
        data: {
          label: 'Solicitud no aprobada',
          subject: 'Resultado de tu solicitud de crédito',
          message: 'Hola {{clientName}},\n\nHemos revisado tu solicitud y lamentablemente en este momento no cumple los requisitos para ser aprobada. Te invitamos a volver a postular en 6 meses. Si tienes dudas, comunícate con nosotros.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 120, y: 1160 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 580, y: 1160 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'form-2'),
      edge('e3', 'form-2', 'ai-1'),
      edge('e4', 'ai-1', 'condition-1'),
      edge('e5', 'condition-1', 'notification-2', 'yes'),
      edge('e6', 'condition-1', 'notification-3', 'no'),
      edge('e7', 'notification-2', 'end-2'),
      edge('e8', 'notification-3', 'end-3'),
    ],
  },

  // ── 7. Diagnóstico y derivación clínica ───────────────────────────────────
  {
    id: 'clinical-diagnosis',
    name: 'Diagnóstico y derivación',
    description: 'Recoge síntomas y antecedentes del paciente, la IA analiza la urgencia y deriva al especialista correcto.',
    icon: '🏥',
    category: 'IA',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 350, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 350, y: 190 },
        data: {
          label: 'Datos del paciente',
          description: 'Ingresa tus datos para comenzar la evaluación.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'Edad', type: 'number', required: true },
            { id: 'f3', label: 'Sexo biológico', type: 'select', required: true, options: ['Masculino', 'Femenino'] },
            { id: 'f4', label: 'Enfermedades crónicas', type: 'textarea', required: false, placeholder: 'Ej: hipertensión, diabetes, asma... (o escriba ninguna)' },
            { id: 'f5', label: 'Medicamentos actuales', type: 'textarea', required: false, placeholder: 'Ej: metformina 500mg... (o escriba ninguno)' },
          ],
        },
      },
      {
        id: 'form-2', type: 'form', position: { x: 350, y: 420 },
        data: {
          label: 'Motivo de consulta',
          description: 'Describe lo que estás experimentando con el mayor detalle posible.',
          fields: [
            { id: 'f6', label: 'Síntoma principal', type: 'textarea', required: true, placeholder: 'Describe tu síntoma principal...' },
            { id: 'f7', label: '¿Hace cuánto tienes estos síntomas?', type: 'select', required: true, options: ['Menos de 24 horas', '1 a 3 días', '4 a 7 días', 'Más de una semana', 'Más de un mes'] },
            { id: 'f8', label: 'Intensidad del malestar', type: 'scale', required: true, max: 10, style: 'numbers', labels: { 1: 'Leve', 10: 'Muy intenso' } },
            { id: 'f9', label: '¿Tienes fiebre?', type: 'select', required: true, options: ['No', 'Sí, menor a 38°C', 'Sí, 38°C o más'] },
            { id: 'f10', label: 'Síntomas adicionales', type: 'textarea', required: false, placeholder: 'Otros síntomas que notes...' },
          ],
        },
      },
      {
        id: 'ai-1', type: 'ai', position: { x: 350, y: 660 },
        data: {
          label: 'Análisis clínico',
          aiPrompt: 'Eres un asistente clínico. Analiza los síntomas, antecedentes y medicamentos del paciente. Evalúa el nivel de urgencia (urgente / moderado / leve) y sugiere la especialidad médica más adecuada para la derivación. No diagnostiques enfermedades, solo orienta sobre urgencia y especialidad. Sé claro y empático.',
        },
      },
      {
        id: 'condition-1', type: 'condition', position: { x: 350, y: 830 },
        data: { label: '¿Requiere atención urgente?', condition: 'Los síntomas presentan signos de urgencia como fiebre alta, dolor intenso o síntomas de aparición súbita.' },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 120, y: 1010 },
        data: {
          label: 'Atención urgente',
          subject: 'Atención requerida — {{clientName}}',
          message: 'Hola {{clientName}},\n\nSegún tu evaluación, te recomendamos buscar atención médica a la brevedad. Un profesional de nuestra red te contactará en los próximos 30 minutos para coordinar tu atención. Si los síntomas empeoran, dirígete directamente a urgencias.',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 580, y: 1010 },
        data: {
          label: 'Derivación programada',
          subject: 'Tu hora médica está siendo gestionada, {{clientName}}',
          message: 'Hola {{clientName}},\n\nHemos recibido tu evaluación. Un coordinador te contactará en el próximo día hábil para agendar tu hora con el especialista indicado. Recuerda mantener reposo relativo y tomar abundante líquido.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 120, y: 1180 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 580, y: 1180 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'form-2'),
      edge('e3', 'form-2', 'ai-1'),
      edge('e4', 'ai-1', 'condition-1'),
      edge('e5', 'condition-1', 'notification-2', 'yes'),
      edge('e6', 'condition-1', 'notification-3', 'no'),
      edge('e7', 'notification-2', 'end-2'),
      edge('e8', 'notification-3', 'end-3'),
    ],
  },

  // ── 8. Proceso de reclamos ─────────────────────────────────────────────────
  {
    id: 'complaint-process',
    name: 'Gestión de reclamos',
    description: 'El cliente describe su reclamo, lo categoriza y queda derivado al equipo correcto según el tipo.',
    icon: '📣',
    category: 'decisión',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 400, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 400, y: 190 },
        data: {
          label: 'Datos de contacto',
          description: 'Necesitamos tus datos para hacer seguimiento a tu reclamo.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'Email', type: 'email', required: true },
            { id: 'f3', label: 'Teléfono', type: 'phone', required: false },
            { id: 'f4', label: 'Número de orden o contrato', type: 'text', required: false, placeholder: 'Si aplica' },
          ],
        },
      },
      {
        id: 'form-2', type: 'form', position: { x: 400, y: 400 },
        data: {
          label: 'Detalle del reclamo',
          description: 'Cuéntanos qué ocurrió con el mayor detalle posible.',
          fields: [
            { id: 'f5', label: 'Describe el problema', type: 'textarea', required: true, placeholder: '¿Qué ocurrió? ¿Cuándo? ¿Cómo te afectó?' },
            { id: 'f6', label: '¿Qué solución esperas?', type: 'textarea', required: true, placeholder: 'Ej: reembolso, reposición del producto, disculpa formal...' },
            { id: 'f7', label: 'Nivel de urgencia', type: 'select', required: true, options: ['Puede esperar', 'Esta semana', 'Hoy mismo'] },
          ],
        },
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 400, y: 610 },
        data: {
          label: '¿Qué tipo de reclamo es?',
          description: 'Elige la categoría que mejor describe tu situación.',
          options: [
            { id: 'opt-1', label: 'Producto defectuoso' },
            { id: 'opt-2', label: 'Problema de servicio' },
            { id: 'opt-3', label: 'Cobro incorrecto' },
          ],
        },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 100, y: 820 },
        data: {
          label: 'Reclamo — Producto',
          subject: 'Recibimos tu reclamo, {{clientName}}',
          message: 'Hola {{clientName}},\n\nHemos registrado tu reclamo por producto defectuoso. Nuestro equipo de calidad lo revisará y te contactará en un plazo máximo de 48 horas hábiles con una solución. Número de caso: #PROD-' + Date.now().toString().slice(-6),
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 400, y: 820 },
        data: {
          label: 'Reclamo — Servicio',
          subject: 'Recibimos tu reclamo, {{clientName}}',
          message: 'Hola {{clientName}},\n\nHemos registrado tu reclamo por falla en el servicio. Un ejecutivo de experiencia al cliente revisará tu caso y se pondrá en contacto contigo en un plazo de 24 horas hábiles.',
        },
      },
      {
        id: 'notification-4', type: 'notification', position: { x: 700, y: 820 },
        data: {
          label: 'Reclamo — Cobro',
          subject: 'Recibimos tu reclamo, {{clientName}}',
          message: 'Hola {{clientName}},\n\nHemos registrado tu reclamo por cobro incorrecto. Nuestro equipo de finanzas revisará tu caso con prioridad. Te contactaremos en máximo 24 horas con el detalle de la revisión y, si corresponde, el proceso de devolución.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 100, y: 990 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 400, y: 990 }, data: { label: 'Fin' } },
      { id: 'end-4', type: 'end', position: { x: 700, y: 990 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'form-2'),
      edge('e3', 'form-2', 'decision-1'),
      edge('e4', 'decision-1', 'notification-2', 'opt-1'),
      edge('e5', 'decision-1', 'notification-3', 'opt-2'),
      edge('e6', 'decision-1', 'notification-4', 'opt-3'),
      edge('e7', 'notification-2', 'end-2'),
      edge('e8', 'notification-3', 'end-3'),
      edge('e9', 'notification-4', 'end-4'),
    ],
  },

  // ── 9. Proceso de arriendo inmobiliario ───────────────────────────────────
  {
    id: 'rental-process',
    name: 'Solicitud de arriendo',
    description: 'Recolecta antecedentes del arrendatario, la IA evalúa su perfil y deriva según la viabilidad.',
    icon: '🏠',
    category: 'IA',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 350, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 350, y: 190 },
        data: {
          label: 'Datos personales',
          description: 'Cuéntanos sobre ti para iniciar tu solicitud de arriendo.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'RUT', type: 'text', required: true, placeholder: '12.345.678-9' },
            { id: 'f3', label: 'Email', type: 'email', required: true },
            { id: 'f4', label: 'Teléfono', type: 'phone', required: true },
            { id: 'f5', label: 'Número de personas que habitarán', type: 'number', required: true },
            { id: 'f6', label: '¿Tienes mascotas?', type: 'select', required: true, options: ['No', 'Sí, perro o gato pequeño', 'Sí, perro grande', 'Otras mascotas'] },
          ],
        },
      },
      {
        id: 'form-2', type: 'form', position: { x: 350, y: 430 },
        data: {
          label: 'Antecedentes financieros',
          description: 'Esta información es confidencial y solo se usa para evaluar tu solicitud.',
          fields: [
            { id: 'f7', label: 'Actividad u ocupación', type: 'select', required: true, options: ['Empleado dependiente', 'Independiente / Honorarios', 'Empresario', 'Jubilado', 'Estudiante con apoyo familiar'] },
            { id: 'f8', label: 'Renta mensual líquida aproximada', type: 'select', required: true, options: ['Menos de $500.000', '$500.000 - $1.000.000', '$1.000.000 - $2.000.000', '$2.000.000 - $3.500.000', 'Más de $3.500.000'] },
            { id: 'f9', label: '¿Tienes aval o codeudor disponible?', type: 'select', required: true, options: ['Sí', 'No', 'Podría conseguir uno'] },
            { id: 'f10', label: '¿Has tenido problemas de pago de arriendos anteriores?', type: 'select', required: true, options: ['No', 'Sí, pero están resueltos', 'Prefiero no responder'] },
            { id: 'f11', label: '¿Puedes pagar 1 mes de garantía + mes en curso?', type: 'select', required: true, options: ['Sí, sin problema', 'Necesito facilidades', 'No en este momento'] },
          ],
        },
      },
      {
        id: 'ai-1', type: 'ai', position: { x: 350, y: 680 },
        data: {
          label: 'Evaluación del arrendatario',
          aiPrompt: 'Eres un analista inmobiliario. Evalúa el perfil del arrendatario considerando: renta (debe ser al menos 3x el valor del arriendo si está disponible), estabilidad laboral, disponibilidad de garantía y aval, y antecedentes de pago. Emite una recomendación de aceptación, aceptación con condiciones o rechazo, con justificación breve y objetiva.',
        },
      },
      {
        id: 'condition-1', type: 'condition', position: { x: 350, y: 850 },
        data: { label: '¿Perfil viable?', condition: 'El arrendatario tiene ingresos suficientes, estabilidad laboral y capacidad de pago de garantía.' },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 120, y: 1030 },
        data: {
          label: 'Perfil aprobado',
          subject: '¡Tu solicitud avanzó, {{clientName}}!',
          message: 'Hola {{clientName}},\n\nTu perfil ha sido pre-aprobado. Un ejecutivo te contactará en las próximas 24 horas para coordinar la visita a la propiedad y los pasos siguientes del proceso de arriendo.',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 580, y: 1030 },
        data: {
          label: 'Perfil no aprobado',
          subject: 'Resultado de tu solicitud de arriendo',
          message: 'Hola {{clientName}},\n\nLamentablemente, tu perfil no cumple los requisitos mínimos para este arriendo en este momento. Te invitamos a postular con un codeudor o a consultar por propiedades con menor valor de arriendo. Quedamos a tu disposición.',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 120, y: 1200 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 580, y: 1200 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'form-2'),
      edge('e3', 'form-2', 'ai-1'),
      edge('e4', 'ai-1', 'condition-1'),
      edge('e5', 'condition-1', 'notification-2', 'yes'),
      edge('e6', 'condition-1', 'notification-3', 'no'),
      edge('e7', 'notification-2', 'end-2'),
      edge('e8', 'notification-3', 'end-3'),
    ],
  },

  // ── 10. Inscripción a curso o evento ──────────────────────────────────────
  {
    id: 'event-registration',
    name: 'Inscripción a curso o evento',
    description: 'Registra asistentes, recolecta preferencias y les envía toda la información necesaria según su elección.',
    icon: '🎓',
    category: 'básico',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 400, y: 40 }, data: { label: 'Inicio' } },
      {
        id: 'form-1', type: 'form', position: { x: 400, y: 190 },
        data: {
          label: 'Datos del inscrito',
          description: 'Completa tu inscripción en pocos pasos.',
          fields: [
            { id: 'f1', label: 'Nombre completo', type: 'text', required: true },
            { id: 'f2', label: 'Email', type: 'email', required: true },
            { id: 'f3', label: 'Teléfono', type: 'phone', required: false },
            { id: 'f4', label: 'Empresa u organización', type: 'text', required: false },
            { id: 'f5', label: '¿Cómo te enteraste del evento?', type: 'select', required: false, options: ['Redes sociales', 'Email', 'Recomendación', 'Buscador', 'Otro'] },
          ],
        },
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 400, y: 400 },
        data: {
          label: '¿Qué modalidad prefieres?',
          description: 'Elige cómo quieres participar.',
          options: [
            { id: 'opt-1', label: 'Presencial' },
            { id: 'opt-2', label: 'Online en vivo' },
            { id: 'opt-3', label: 'Grabación posterior' },
          ],
        },
      },
      {
        id: 'notification-2', type: 'notification', position: { x: 100, y: 610 },
        data: {
          label: 'Confirmación presencial',
          subject: '¡Inscripción confirmada! — {{clientName}}',
          message: 'Hola {{clientName}},\n\n¡Tu inscripción presencial está confirmada!\n\n📍 Lugar: [Dirección del evento]\n📅 Fecha: [Fecha]\n🕐 Hora: [Hora]\n\nRecuerda traer tu documento de identidad. Si tienes alguna duda, responde este email.',
        },
      },
      {
        id: 'notification-3', type: 'notification', position: { x: 400, y: 610 },
        data: {
          label: 'Confirmación online',
          subject: '¡Inscripción confirmada! — {{clientName}}',
          message: 'Hola {{clientName}},\n\n¡Tu inscripción online está confirmada!\n\n🔗 Link de acceso: [Link de Zoom/Meet]\n📅 Fecha: [Fecha]\n🕐 Hora: [Hora]\n\nTe enviaremos un recordatorio 1 hora antes del inicio. ¡Te esperamos!',
        },
      },
      {
        id: 'notification-4', type: 'notification', position: { x: 700, y: 610 },
        data: {
          label: 'Confirmación grabación',
          subject: '¡Inscripción confirmada! — {{clientName}}',
          message: 'Hola {{clientName}},\n\nTu inscripción está confirmada. Recibirás acceso a la grabación del evento dentro de las 48 horas posteriores a su realización.\n\n📅 Evento: [Fecha]\n\nEl link de acceso llegará a este email automáticamente. ¡Gracias por inscribirte!',
        },
      },
      { id: 'end-2', type: 'end', position: { x: 100, y: 780 }, data: { label: 'Fin' } },
      { id: 'end-3', type: 'end', position: { x: 400, y: 780 }, data: { label: 'Fin' } },
      { id: 'end-4', type: 'end', position: { x: 700, y: 780 }, data: { label: 'Fin' } },
    ],
    edges: [
      edge('e1', 'start-1', 'form-1'),
      edge('e2', 'form-1', 'decision-1'),
      edge('e3', 'decision-1', 'notification-2', 'opt-1'),
      edge('e4', 'decision-1', 'notification-3', 'opt-2'),
      edge('e5', 'decision-1', 'notification-4', 'opt-3'),
      edge('e6', 'notification-2', 'end-2'),
      edge('e7', 'notification-3', 'end-3'),
      edge('e8', 'notification-4', 'end-4'),
    ],
  },
]

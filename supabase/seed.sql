-- ============================================================
-- Seed inicial: banco de preguntas HubSpot (22 preguntas)
-- 8 básicas (1 pt) · 8 intermedias (2 pts) · 6 avanzadas (3 pts)
-- Puntaje máximo: 8 + 16 + 18 = 42 puntos
-- correct_answers usa índices base 0 de "options"
-- Ejecutar DESPUÉS de schema.sql en el SQL Editor de Supabase
-- ============================================================

truncate table public.questions;

insert into public.questions (level, type, text, options, correct_answers, points, justification) values

-- ================= NIVEL BÁSICO (1 punto) =================

('basico', 'single',
 'En HubSpot CRM, ¿cómo se relacionan los objetos Contacto y Empresa?',
 '["Un contacto solo puede pertenecer a una empresa y nunca a varias","Un contacto puede asociarse a varias empresas, pero tiene una empresa principal","Contactos y empresas no se pueden asociar: son módulos independientes","La asociación solo es posible mediante una integración externa"]',
 '[1]', 1,
 'La asociación contacto-empresa es de muchos a muchos, pero existe una empresa "principal" que se usa en propiedades y reportes.'),

('basico', 'single',
 '¿Qué es una propiedad (property) en HubSpot?',
 '["Un permiso de usuario del CRM","Un campo que almacena información de un registro (contacto, empresa, trato o ticket)","Una plantilla de correo de marketing","Un filtro fijo del pipeline de ventas"]',
 '[1]', 1,
 'Las propiedades son los campos que estructuran la información de cada objeto; pueden ser estándar o personalizadas.'),

('basico', 'single',
 '¿Qué representan las etapas (deal stages) de un pipeline en Sales Hub?',
 '["Los tipos de producto que vende la empresa","Las fases del proceso comercial por las que pasa un trato, cada una con probabilidad de cierre configurable","Los permisos de acceso de cada vendedor","Las campañas de marketing activas"]',
 '[1]', 1,
 'Cada etapa tiene nombre, orden y una probabilidad que alimenta los pronósticos (forecast) del pipeline.'),

('basico', 'single',
 '¿Qué determina si un contacto es "contacto de marketing" en HubSpot?',
 '["Su propietario en el CRM","Una propiedad que define si el contacto puede recibir comunicaciones de marketing y cuenta hacia el límite del plan","La fecha de creación del contacto","Que haya abierto al menos un correo"]',
 '[1]', 1,
 'El estado de contacto de marketing es una propiedad editable que define facturación y límites del plan.'),

('basico', 'single',
 'Para ver cuántos tratos hay en cada etapa del pipeline y su valor, ¿qué vista nativa usas?',
 '["Análisis de anuncios (Ads)","El tablero del pipeline de ventas (Deal pipeline / forecast)","Analítica de correos","La biblioteca de plantillas y documentos"]',
 '[1]', 1,
 'El pipeline dashboard muestra cantidad y monto de tratos por etapa en tiempo real.'),

('basico', 'single',
 'Cuando un visitante envía un formulario de HubSpot, ¿qué ocurre por defecto?',
 '["Se crea o actualiza un contacto identificado por su correo electrónico","Solo se envía una notificación interna, sin crear registros","Se crea una empresa automáticamente","Se genera un trato en la primera etapa del pipeline"]',
 '[0]', 1,
 'El formulario hace upsert del contacto usando el email como identificador único.'),

('basico', 'boolean',
 'Un trato (deal) puede existir en HubSpot sin estar asociado a ningún contacto.',
 '["Verdadero","Falso"]',
 '[0]', 1,
 'Las asociaciones son opcionales, aunque recomendables para trazabilidad comercial.'),

('basico', 'boolean',
 'En HubSpot, el número de teléfono actúa por defecto como identificador para detectar contactos duplicados.',
 '["Verdadero","Falso"]',
 '[1]', 1,
 'El identificador por defecto de deduplicación es el correo electrónico, no el teléfono.'),

-- ================= NIVEL INTERMEDIO (2 puntos) =================

('intermedio', 'single',
 '¿Dónde se configura un lead scoring nativo en HubSpot?',
 '["Solo mediante la API de HubSpot","En Configuración → Propiedades, creando una propiedad de tipo Score con criterios positivos y negativos","En la herramienta de Anuncios (Ads)","En el editor de plantillas de correo"]',
 '[1]', 2,
 'La propiedad de tipo puntuación suma/resta puntos según criterios y se usa en workflows, listas y enrutamiento.'),

('intermedio', 'single',
 '¿Para qué sirve establecer una meta (goal) en un workflow?',
 '["Para limitar a cuántos contactos puede inscribirse el workflow","Para medir la efectividad del workflow y desinscribir automáticamente a quienes la cumplen","Para definir el horario de envío de los correos","Para asignar el workflow a un equipo específico"]',
 '[1]', 2,
 'Al cumplir la meta, el contacto sale del flujo y se registra la conversión para reporting.'),

('intermedio', 'single',
 'En reportes de atribución, ¿qué mide el modelo de "primer contacto" (first-touch)?',
 '["El último punto de contacto antes de la conversión","El primer evento conocido que originó el contacto de marketing","Un promedio ponderado de todos los puntos de contacto","El canal con mayor inversión publicitaria"]',
 '[1]', 2,
 'First-touch asigna el 100% del crédito al primer touchpoint del recorrido.'),

('intermedio', 'single',
 '¿Qué propiedad usarías para mostrar la suma de los montos de los tratos ganados de cada empresa?',
 '["Una propiedad de texto enriquecido","Una propiedad calculada tipo rollup con operación de suma sobre los tratos asociados","Una propiedad de archivo (file)","Una propiedad de fecha"]',
 '[1]', 2,
 'Las propiedades rollup agregan (suma, promedio, máximo, conteo) valores de registros asociados.'),

('intermedio', 'single',
 '¿Cuál es la diferencia entre una lista activa y una lista estática en HubSpot?',
 '["La activa se recalcula automáticamente cuando los registros cumplen o dejan de cumplir los criterios; la estática no cambia","La activa solo funciona para contactos y la estática para empresas","La estática se actualiza cada noche de forma automática","No hay diferencia: son sinónimos"]',
 '[0]', 2,
 'Las listas activas son dinámicas y son la base de la segmentación para workflows.'),

('intermedio', 'single',
 '¿Qué son los filtros de un dashboard en HubSpot?',
 '["Filtros globales que se aplican a todos los reportes compatibles del dashboard (fecha, propietario, equipo, pipeline)","Permisos que definen quién puede ver el dashboard","Colores condicionales de los reportes","Notificaciones por correo del dashboard"]',
 '[0]', 2,
 'Un solo filtro cambia todos los reportes del dashboard que soportan ese campo.'),

('intermedio', 'multiple',
 '¿Cuáles de estas métricas pueden analizarse con reportes nativos de Marketing Hub? (selecciona todas las correctas)',
 '["Tasa de conversión de formularios","Ingresos atribuidos a campañas de marketing","Latencia promedio de los servidores del sitio web","Aperturas y clics de correos de marketing"]',
 '[0,1,3]', 2,
 'La monitorización de infraestructura del sitio no forma parte de los reportes nativos de HubSpot.'),

('intermedio', 'multiple',
 '¿Cuáles de las siguientes acciones puede ejecutar un workflow de HubSpot de forma nativa? (selecciona todas las correctas)',
 '["Enviar un correo de marketing","Crear una tarea para el propietario del contacto","Aumentar o disminuir una propiedad de puntuación (score)","Emitir facturas electrónicas al cliente"]',
 '[0,1,2]', 2,
 'La facturación electrónica no es una acción nativa de los workflows.'),

-- ================= NIVEL AVANZADO (3 puntos) =================

('avanzado', 'single',
 '¿Qué scope de OAuth se requiere para crear contactos con la API v3 de HubSpot (crm/v3/objects/contacts)?',
 '["crm.objects.contacts.write","crm.objects.contacts.read","crm.schemas.deals.write","analytics.read"]',
 '[0]', 3,
 'La operación POST sobre el objeto contactos exige el scope de escritura correspondiente.'),

('avanzado', 'single',
 'Al recibir un webhook de HubSpot en tu endpoint, ¿cómo verificas que la petición proviene realmente de HubSpot?',
 '["Confirmando que el cuerpo venga en formato JSON","Validando la firma del encabezado X-HubSpot-Signature (HMAC-SHA256 con el secreto de la aplicación)","Comprobando la dirección IP del visitante","No es necesario verificar nada"]',
 '[1]', 3,
 'El signature header calculado con el app secret evita peticiones falsificadas contra el endpoint.'),

('avanzado', 'single',
 '¿Qué modelo de atribución distribuye el crédito por igual entre todos los puntos de contacto del recorrido?',
 '["Primer contacto","Último contacto","Lineal","En U (posicional)"]',
 '[2]', 3,
 'El modelo lineal reparte equitativamente; el posicional pondera el primer y el último contacto.'),

('avanzado', 'single',
 'Al fusionar dos contactos duplicados en HubSpot, ¿qué ocurre con los valores de las propiedades?',
 '["El registro principal conserva sus valores; los del secundario rellenan solo las propiedades vacías, y las actividades/asociaciones se combinan","Todos los valores del secundario sobrescriben los del principal","Las actividades del secundario se pierden definitivamente","Se crea un tercer contacto con la mezcla de ambos"]',
 '[0]', 3,
 'La fusión prioriza el registro primario y consolida el historial de actividades y asociaciones.'),

('avanzado', 'single',
 'Para que HubSpot clasifique un contacto como fuente de pago en redes (Paid Social) con submedio "facebook", la URL debe incluir…',
 '["utm_medium=paid_social y utm_source=facebook","utm_source=paid y utm_medium=social","fbclid y ref=meta únicamente","utm_campaign=facebook_ads únicamente"]',
 '[0]', 3,
 'HubSpot mapea fuente y submedio desde los parámetros utm_source y utm_medium de la URL.'),

('avanzado', 'single',
 'Tu equipo debe contactar todo lead nuevo en menos de 15 minutos en horario laboral (SLA de speed-to-lead). ¿Qué implementación nativa es la correcta?',
 '["Un workflow que, al crearse el lead, cree una tarea de alta prioridad para el vendedor y envíe notificación al equipo","Un recordatorio de calendario manual para cada comercial","El plan gratuito de HubSpot lo hace automáticamente sin configuración","No es posible automatizarlo dentro de HubSpot"]',
 '[0]', 3,
 'Los workflows de Sales Hub con tareas prioritarias y notificaciones son el mecanismo nativo para SLAs de seguimiento y enrutamiento de leads.');

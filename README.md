# Portal de Evaluación Técnica HubSpot — Politécnico Internacional

Aplicación web para la evaluación técnica de candidatos al puesto **Analista de Datos y CRM (HubSpot)**.

- El **candidato** completa una evaluación en línea (preguntas de HubSpot por niveles) y solo ve la confirmación de envío — nunca su puntaje ni las respuestas correctas.
- El **Super Admin** accede a un panel protegido con dashboard, tabla de resultados, detalle pregunta por pregunta, clave de respuestas, CRUD del banco de preguntas y exportación CSV.

## Stack

| Capa | Tecnología | Plan |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Vercel Hobby (gratis) |
| Estilos | Tailwind CSS 3 | — |
| Base de datos | Supabase Postgres | Free (500 MB) |
| Autenticación | Supabase Auth (correo + contraseña) | Free |

100% gratuito. No se usa ningún servicio de pago.

## Arquitectura y decisiones de seguridad

1. **La calificación ocurre solo en el servidor.** `POST /api/submissions` recibe las respuestas, las compara contra el banco (leído con la service role key en memoria del servidor) y persiste puntajes. La respuesta al cliente es únicamente `{ ok: true }`.
2. **Las respuestas correctas nunca salen del servidor.** `GET /api/questions` (única ruta pública de datos) devuelve solo id, enunciado, opciones, tipo y nivel — sin `correct_answers` ni `justification`, y sin puntajes. Ninguna tabla es accesible con la anon key (RLS activado sin políticas).
3. **Rutas `/admin` y `/api/admin` protegidas por middleware** de Next.js que valida la sesión de Supabase con `getUser()` (verificación server-side del token, no solo cookie) y además exige que el correo coincida con `ADMIN_EMAIL`. Doble barrera: aunque alguien cree una cuenta en Supabase Auth, no accede al panel.
4. **Snapshot de calificación por envío.** Cada `submission` guarda el detalle pregunta por pregunta (texto, opciones, respuesta dada vs. correcta, puntos, justificación). Si el admin edita el banco después, los resultados históricos no se distorsionan.
5. **Un envío por correo.** Verificación de duplicado antes de insertar (HTTP 409 con mensaje claro). Existe además constraint `unique` en la columna `email` como red de seguridad ante condiciones de carrera.
6. **Validación en ambos extremos.** El formulario del candidato valida antes de enviar; el servidor re-valida todo (formatos, índices dentro de rango, todas las preguntas respondidas, sin claves desconocidas).

### Reglas de calificación

- Ponderación: básico = 1 pt, intermedio = 2 pts, avanzado = 3 pts.
- Selección múltiple: **sin puntaje parcial** (conjunto exacto = puntos completos; si no, 0).
- Reporte: puntaje total + % por nivel.
- Clasificación del candidato (sobre % total): **≥ 80% Avanzado · 50–79% Intermedio · < 50% Básico**.

## Configuración paso a paso

### 1. Crear el proyecto en Supabase (gratis)

1. Entra a [supabase.com](https://supabase.com) → **New project** (plan Free).
2. Guarda la contraseña del proyecto (no la necesita la app, pero no la pierdas).
3. Espera a que el proyecto termine de aprovisionarse.

### 2. Crear las tablas

1. En Supabase Studio → **SQL Editor** → **New query**.
2. Pega el contenido completo de `supabase/schema.sql` → **Run**.
3. Nueva query, pega `supabase/seed.sql` → **Run** (carga las 22 preguntas).
   - Verifica en **Table Editor → questions** que haya 22 filas.

### 3. Crear el Super Admin

1. Supabase Studio → **Authentication → Users → Add user**.
2. Correo: por ejemplo `admin@politecnico.edu.co` (el que quieras).
3. Contraseña segura (mín. 8 caracteres) → marca **Auto Confirm User**.
4. **Importante (bloqueo de registros públicos):** **Authentication → Providers → Email → desactiva "Allow new users to sign up"**. Así nadie más puede crear cuentas; y aunque lo hiciera, el middleware solo admite el correo de `ADMIN_EMAIL`.

### 4. Variables de entorno

Copia `.env.example` a `.env.local` y complétalo (Project Settings → API en Supabase Studio):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # "service_role" — SECRETO, nunca al frontend
ADMIN_EMAIL=admin@politecnico.edu.co        # el correo creado en el paso 3
```

### 5. Ejecutar localmente

```bash
npm install
npm run dev
# http://localhost:3000
```

### 6. Deploy en Vercel (plan Hobby gratis)

1. Sube el repo a GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. En **Environment Variables** agrega las 4 variables del paso 4 (marcando Production y Preview).
4. **Deploy**. Vercel detecta Next.js automáticamente (sin configuración extra).

## Uso

| Rol | Flujo |
|---|---|
| Candidato | `/` → leer instrucciones → **Iniciar evaluación** → completar datos + 22 preguntas → **Enviar** → confirmación. |
| Super Admin | `/admin/login` → credenciales → dashboard con métricas, tabla, filtros y CSV → detalle por candidato → banco de preguntas (CRUD) → clave de respuestas. |

## Estructura del proyecto

```
app/
  page.tsx                    # Landing + botón iniciar
  evaluacion/page.tsx         # Formulario del candidato
  admin/
    login/page.tsx            # Login (Supabase Auth)
    page.tsx                  # Dashboard + tabla + filtros + export
    [id]/page.tsx             # Detalle pregunta por pregunta
    clave/page.tsx            # Clave de respuestas (solo admin)
    preguntas/page.tsx        # CRUD del banco
    actions.ts                # Server actions (auth + CRUD)
  api/
    questions/route.ts        # GET público (sin respuestas correctas)
    submissions/route.ts      # POST público (califica en servidor)
    admin/export/route.ts     # GET CSV (protegido por middleware)
components/
  evaluation-form.tsx         # Formulario cliente
lib/
  grading.ts                  # Lógica de calificación (solo servidor)
  types.ts                    # Tipos compartidos
  supabase/server.ts          # Clientes Supabase (cookie + service role)
  supabase/middleware.ts      # Protección de sesión
middleware.ts                 # Guard de /admin y /api/admin
supabase/
  schema.sql                  # Tablas + RLS
  seed.sql                    # 22 preguntas HubSpot
```

## Limitaciones del plan gratuito

- **Supabase Free:** 500 MB de Postgres (suficiente: cada envío pesa unos KB), pausa del proyecto tras ~1 semana de inactividad (basta entrar al dashboard para reactivarlo). Auth incluido sin costo.
- **Vercel Hobby:** orientado a uso no comercial (encaja con un proceso de selección), 100 GB de ancho de banda/mes, funciones serverless con límites de ejecución generosos para este volumen.
- **Sin rate-limit por IP** en el envío público: el bloqueo por correo único + validaciones server-side mitigan el abuso. Si algún día se necesita, añadir Upstash Redis (free tier) con contador por IP es un cambio de ~20 líneas.
- **Sin recuperación de contraseña** desde la UI: se gestiona directamente en Supabase Studio → Authentication → Users → Send password recovery.
- **Un solo admin** (el definido en `ADMIN_EMAIL`). Para varios admins, la estructura ya lo soporta cambiando el chequeo del middleware a una lista o a un claim.

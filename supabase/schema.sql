-- ============================================================
-- Portal de Evaluación HubSpot — Politécnico Internacional
-- Esquema de base de datos (ejecutar en Supabase SQL Editor)
-- ============================================================

create extension if not exists pgcrypto;

-- Banco de preguntas (solo accesible vía SERVICE_ROLE desde el servidor)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('basico', 'intermedio', 'avanzado')),
  type text not null check (type in ('single', 'multiple', 'boolean')),
  text text not null check (length(trim(text)) >= 10),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  correct_answers jsonb not null check (jsonb_typeof(correct_answers) = 'array' and jsonb_array_length(correct_answers) >= 1),
  points integer not null,
  justification text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint points_matches_level check (
    (level = 'basico' and points = 1) or
    (level = 'intermedio' and points = 2) or
    (level = 'avanzado' and points = 3)
  )
);

-- Envíos de candidatos con snapshot de calificación
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null check (length(trim(candidate_name)) between 3 and 120),
  email text not null unique,
  phone text not null,
  position text not null,
  answers jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  score_basic integer not null default 0,
  score_intermediate integer not null default 0,
  score_advanced integer not null default 0,
  max_basic integer not null default 0,
  max_intermediate integer not null default 0,
  max_advanced integer not null default 0,
  total_earned integer not null default 0,
  total_max integer not null default 0,
  end_reason text not null default 'submitted',
  elapsed_seconds integer,
  submitted_at timestamptz not null default now()
);

-- Sesión de examen por correo: cronómetro anclado al servidor
create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  candidate_name text not null,
  phone text not null,
  position text not null,
  started_at timestamptz not null default now(),
  finished boolean not null default false,
  submission_id uuid references public.submissions(id)
);

-- RLS activado SIN políticas: ni anon ni authenticated pueden leer/escribir.
-- Todo el acceso se realiza desde el servidor Next.js con SUPABASE_SERVICE_ROLE_KEY.
-- Las respuestas correctas y los puntajes jamás viajan al cliente público.
alter table public.questions enable row level security;
alter table public.submissions enable row level security;

create index if not exists submissions_submitted_at_idx on public.submissions (submitted_at desc);
create index if not exists submissions_email_idx on public.submissions (email);
create index if not exists questions_active_idx on public.questions (active);

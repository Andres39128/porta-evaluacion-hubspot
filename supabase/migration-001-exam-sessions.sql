-- ============================================================
-- Migración 001: sesiones de examen + motivo de cierre
-- Ejecutar en Supabase SQL Editor sobre el proyecto EXISTENTE.
-- Es aditiva: no rompe la versión en producción actual.
-- ============================================================

-- Sesión por correo: ancla el inicio del cronómetro en el servidor
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

alter table public.exam_sessions enable row level security;

create index if not exists exam_sessions_started_at_idx on public.exam_sessions (started_at desc);

-- Motivo de cierre del examen (visible solo en el panel admin)
alter table public.submissions add column if not exists end_reason text
  not null default 'submitted';

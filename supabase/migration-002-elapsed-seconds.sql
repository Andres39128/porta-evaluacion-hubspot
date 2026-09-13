-- ============================================================
-- Migración 002: tiempo utilizado en el envío
-- Ejecutar en Supabase SQL Editor sobre el proyecto EXISTENTE.
-- Es aditiva: no rompe la versión en producción actual.
-- ============================================================

-- Segundos entre el inicio de la sesión y el cierre del examen.
-- Alimenta la métrica de confiabilidad (bandera de velocidad implausible).
alter table public.submissions add column if not exists elapsed_seconds integer;

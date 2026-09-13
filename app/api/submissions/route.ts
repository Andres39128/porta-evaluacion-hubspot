import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { gradeSubmission } from '@/lib/grading';
import type { QuestionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Payload {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  position?: unknown;
  answers?: unknown;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Recibe el envío del candidato, valida, califica EN SERVIDOR y persiste.
 * La respuesta NUNCA incluye puntaje ni respuestas correctas.
 */
export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return bad('Cuerpo de la petición inválido.');
  }

  // --- Validación de datos del candidato ---
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const position = typeof body.position === 'string' ? body.position.trim() : '';

  if (name.length < 3 || name.length > 120) return bad('Nombre inválido.');
  if (!EMAIL_RE.test(email) || email.length > 160) return bad('Correo inválido.');
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return bad('Teléfono inválido.');
  if (position.length < 3 || position.length > 120) return bad('Cargo inválido.');

  // --- Validación de respuestas ---
  if (typeof body.answers !== 'object' || body.answers === null || Array.isArray(body.answers)) {
    return bad('Formato de respuestas inválido.');
  }
  const rawAnswers = body.answers as Record<string, unknown>;

  try {
    const supabase = getSupabaseAdmin();

    // Banco activo COMPLETO (con correct_answers) — solo en memoria del servidor.
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (qError || !questions) {
      console.error('POST /api/submissions select questions:', qError?.message);
      return bad('Error interno. Intenta más tarde.', 500);
    }

    const rows = questions as QuestionRow[];

    // Normaliza y valida cada respuesta contra el banco.
    const normalized: Record<string, number[]> = {};
    for (const q of rows) {
      const value = rawAnswers[q.id];
      if (!UUID_RE.test(q.id)) continue; // defensa extra
      const list = Array.isArray(value) ? value : [];

      const indexes: number[] = [];
      for (const v of list) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isInteger(n) || n < 0 || n >= q.options.length) {
          return bad('Respuesta fuera de rango.');
        }
        if (!indexes.includes(n)) indexes.push(n);
      }

      if (indexes.length === 0) return bad('Responde todas las preguntas antes de enviar.');
      if (q.type !== 'multiple' && indexes.length > 1) {
        return bad('Formato de respuesta inválido.');
      }
      normalized[q.id] = indexes;
    }
    if (Object.keys(normalized).length !== rows.length) {
      return bad('Responde todas las preguntas antes de enviar.');
    }
    // Claves extra que no corresponden a preguntas activas → payload manipulado.
    const validIds = new Set(rows.map((q) => q.id));
    for (const key of Object.keys(rawAnswers)) {
      if (!validIds.has(key)) return bad('Respuestas con preguntas inválidas.');
    }

    // --- Bloqueo de duplicados por correo ---
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return bad(
        'Ya existe una evaluación registrada con este correo. Solo se permite un envío por candidato.',
        409
      );
    }

    // --- Calificación en servidor ---
    const grade = gradeSubmission(rows, normalized);

    const { error: insertError } = await supabase.from('submissions').insert({
      candidate_name: name,
      email,
      phone: phoneRaw,
      position,
      answers: normalized,
      results: grade.results,
      score_basic: grade.score_basic,
      score_intermediate: grade.score_intermediate,
      score_advanced: grade.score_advanced,
      max_basic: grade.max_basic,
      max_intermediate: grade.max_intermediate,
      max_advanced: grade.max_advanced,
      total_earned: grade.total_earned,
      total_max: grade.total_max,
    });

    if (insertError) {
      console.error('POST /api/submissions insert:', insertError.message);
      return bad('Error guardando la evaluación. Intenta más tarde.', 500);
    }

    // Confirmación sin exponer puntaje.
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('POST /api/submissions:', e);
    return bad('Error interno. Intenta más tarde.', 500);
  }
}

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { gradeSubmission } from '@/lib/grading';
import { EXAM_GRACE_SECONDS, EXAM_TIME_LIMIT_MINUTES, isEndReason } from '@/lib/exam';
import type { QuestionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Payload {
  sessionId?: unknown;
  answers?: unknown;
  endReason?: unknown;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Cierra la sesión de examen y califica EN SERVIDOR lo respondido.
 * Acepta envíos PARCIALES (timeout / abandono de pantalla / desconexión):
 * lo no respondido puntúa 0. Idempotente: si la sesión ya finalizó,
 * responde 200 sin duplicar (los reintentos automáticos son esperables).
 * La respuesta NUNCA incluye puntaje ni respuestas correctas.
 */
export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return bad('Cuerpo de la petición inválido.');
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!UUID_RE.test(sessionId)) return bad('Sesión inválida.');

  const endReason = isEndReason(body.endReason) ? body.endReason : 'submitted';

  if (
    typeof body.answers !== 'object' ||
    body.answers === null ||
    Array.isArray(body.answers)
  ) {
    return bad('Formato de respuestas inválido.');
  }
  const rawAnswers = body.answers as Record<string, unknown>;

  try {
    const supabase = getSupabaseAdmin();

    const { data: session } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) return bad('Sesión no encontrada.');

    // Idempotencia: eventos de cierre pueden dispararse varias veces.
    if (session.finished) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

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

    // Normaliza respuestas parciales contra el banco activo.
    const normalized: Record<string, number[]> = {};
    for (const q of rows) {
      const value = rawAnswers[q.id];
      const list = Array.isArray(value) ? value : [];
      const indexes: number[] = [];
      for (const v of list) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isInteger(n) || n < 0 || n >= q.options.length) {
          return bad('Respuesta fuera de rango.');
        }
        if (!indexes.includes(n)) indexes.push(n);
      }
      if (q.type !== 'multiple' && indexes.length > 1) {
        return bad('Formato de respuesta inválido.');
      }
      if (indexes.length > 0) normalized[q.id] = indexes;
    }
    // Claves desconocidas → payload manipulado.
    const validIds = new Set(rows.map((q) => q.id));
    for (const key of Object.keys(rawAnswers)) {
      if (!validIds.has(key)) return bad('Respuestas con preguntas inválidas.');
    }

    // Integridad temporal: si el envió llegó tarde, se reporta como timeout.
    let reason = endReason;
    const startedMs = new Date(session.started_at).getTime();
    if (
      reason === 'submitted' &&
      Date.now() > startedMs + (EXAM_TIME_LIMIT_MINUTES * 60 + EXAM_GRACE_SECONDS) * 1000
    ) {
      reason = 'timeout';
    }

    const grade = gradeSubmission(rows, normalized);

    const { data: inserted, error: insertError } = await supabase
      .from('submissions')
      .insert({
        candidate_name: session.candidate_name,
        email: session.email,
        phone: session.phone,
        position: session.position,
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
        end_reason: reason,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('POST /api/submissions insert:', insertError?.message);
      return bad('Error guardando la evaluación. Intenta más tarde.', 500);
    }

    const { error: updateError } = await supabase
      .from('exam_sessions')
      .update({ finished: true, submission_id: inserted.id })
      .eq('id', session.id);

    if (updateError) {
      console.error('POST /api/submissions update session:', updateError?.message);
    }

    // Confirmación sin exponer puntaje.
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('POST /api/submissions:', e);
    return bad('Error interno. Intenta más tarde.', 500);
  }
}

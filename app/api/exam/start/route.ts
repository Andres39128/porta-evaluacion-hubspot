import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { gradeSubmission } from '@/lib/grading';
import {
  EXAM_GRACE_SECONDS,
  EXAM_TIME_LIMIT_MINUTES,
} from '@/lib/exam';
import type { PublicQuestion, QuestionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Payload {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  position?: unknown;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Inicia (o retoma) la sesión de examen de un candidato.
 * El cronómetro vive en el servidor (exam_sessions.started_at):
 * recargar o reabrir la página NO reinicia el tiempo.
 * Devuelve las preguntas SIN respuestas correctas.
 */
export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return bad('Cuerpo de la petición inválido.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const position = typeof body.position === 'string' ? body.position.trim() : '';

  if (name.length < 3 || name.length > 120) return bad('Nombre inválido.');
  if (!EMAIL_RE.test(email) || email.length > 160) return bad('Correo inválido.');
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return bad('Teléfono inválido.');
  if (position.length < 3 || position.length > 120) return bad('Cargo inválido.');

  try {
    const supabase = getSupabaseAdmin();

    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (qError || !questions) {
      console.error('POST /api/exam/start select questions:', qError?.message);
      return bad('Error interno. Intenta más tarde.', 500);
    }
    const rows = questions as QuestionRow[];
    const publicQuestions: PublicQuestion[] = rows.map((q) => ({
      id: q.id,
      level: q.level,
      type: q.type,
      text: q.text,
      options: q.options,
    }));

    const buildResponse = (session: {
      id: string;
      started_at: string;
    }) =>
      NextResponse.json({
        sessionId: session.id,
        startedAt: session.started_at,
        serverTime: new Date().toISOString(),
        timeLimitMinutes: EXAM_TIME_LIMIT_MINUTES,
        questions: publicQuestions,
      });

    // ¿Sesión existente para este correo?
    const { data: existing } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Ya envió su evaluación → no hay reintento.
      if (existing.finished) {
        return bad(
          'Ya existe una evaluación registrada con este correo. Solo se permite un envío por candidato.',
          409
        );
      }

      const startedMs = new Date(existing.started_at).getTime();
      const limitMs = (EXAM_TIME_LIMIT_MINUTES * 60 + EXAM_GRACE_SECONDS) * 1000;

      // Sesión abandonada vencida → se cierra con lo registrado (nada) y se bloquea.
      if (Date.now() > startedMs + limitMs) {
        const grade = gradeSubmission(rows, {});
        const { data: inserted } = await supabase
          .from('submissions')
          .insert({
            candidate_name: existing.candidate_name,
            email,
            phone: existing.phone,
            position: existing.position,
            answers: {},
            results: grade.results,
            score_basic: grade.score_basic,
            score_intermediate: grade.score_intermediate,
            score_advanced: grade.score_advanced,
            max_basic: grade.max_basic,
            max_intermediate: grade.max_intermediate,
            max_advanced: grade.max_advanced,
            total_earned: grade.total_earned,
            total_max: grade.total_max,
            end_reason: 'expired',
          })
          .select('id')
          .single();

        await supabase
          .from('exam_sessions')
          .update({ finished: true, submission_id: inserted?.id ?? null })
          .eq('id', existing.id);

        return bad(
          'Tu sesión anterior expiró sin envío y la evaluación se cerró automáticamente. Contacta al equipo de selección si crees que fue un error.',
          409
        );
      }

      // Sesión vigente (recarga de página): devuelve el MISMO started_at.
      return buildResponse(existing);
    }

    // Sesión nueva: el cronómetro arranca ahora.
    const { data: created, error: insertError } = await supabase
      .from('exam_sessions')
      .insert({ candidate_name: name, email, phone: phoneRaw, position })
      .select('*')
      .single();

    if (insertError || !created) {
      console.error('POST /api/exam/start insert:', insertError?.message);
      return bad('Error iniciando la evaluación. Intenta más tarde.', 500);
    }

    return buildResponse(created);
  } catch (e) {
    console.error('POST /api/exam/start:', e);
    return bad('Error interno. Intenta más tarde.', 500);
  }
}

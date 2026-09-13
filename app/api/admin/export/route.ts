import { getSupabaseAdmin } from '@/lib/supabase/server';
import { classify } from '@/lib/types';
import { END_REASON_LABELS, type EndReason } from '@/lib/exam';
import { computeConfidence } from '@/lib/confidence';
import type { SubmissionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function pct(earned: number, max: number): number {
  return max > 0 ? Math.round((earned / max) * 100) : 0;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}

/** Exportación CSV de resultados. Protegido por el middleware (matcher /api/admin/*). */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error || !data) {
      return new Response('Error exportando resultados', { status: 500 });
    }

    const rows = data as SubmissionRow[];
    const header = [
      'Fecha',
      'Nombre',
      'Correo',
      'Teléfono',
      'Cargo',
      'Puntos',
      'Máximo',
      '% Total',
      '% Básico',
      '% Intermedio',
      '% Avanzado',
      'Clasificación',
      'Cierre',
      'Confiabilidad',
      'Banderas',
    ];

    const lines = rows.map((r) =>
      [
        fmtDate(r.submitted_at),
        r.candidate_name,
        r.email,
        r.phone,
        r.position,
        String(r.total_earned),
        String(r.total_max),
        String(pct(r.total_earned, r.total_max)),
        String(pct(r.score_basic, r.max_basic)),
        String(pct(r.score_intermediate, r.max_intermediate)),
        String(pct(r.score_advanced, r.max_advanced)),
        classify(pct(r.total_earned, r.total_max)),
        END_REASON_LABELS[(r.end_reason ?? 'submitted') as EndReason],
        (() => {
          const conf = computeConfidence(r.results, r.elapsed_seconds ?? null, r.end_reason ?? 'submitted');
          return `${conf.score} (${conf.level})`;
        })(),
        (() => {
          const conf = computeConfidence(r.results, r.elapsed_seconds ?? null, r.end_reason ?? 'submitted');
          return conf.flags.length > 0 ? conf.flags.map((f) => f.label).join(' | ') : '';
        })(),
      ]
        .map(csvEscape)
        .join(',')
    );

    // BOM para que Excel respete UTF-8.
    const csv = '\uFEFF' + [header.map(csvEscape).join(','), ...lines].join('\r\n');

    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="resultados-evaluacion-hubspot.csv"',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response('Error exportando resultados', { status: 500 });
  }
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminNav from '../admin-nav';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { classify, levelLabel } from '@/lib/types';
import type { Level, SubmissionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

function pct(earned: number, max: number): number {
  return max > 0 ? Math.round((earned / max) * 100) : 0;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

function labels(result: { options: string[]; given: number[]; correct: number[] }) {
  const given = result.given.map((i) => result.options[i]).filter(Boolean);
  const correct = result.correct.map((i) => result.options[i]).filter(Boolean);
  return { given, correct };
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();
  const r = data as SubmissionRow;

  const totalPct = pct(r.total_earned, r.total_max);
  const levels: { key: Level; earned: number; max: number }[] = [
    { key: 'basico', earned: r.score_basic, max: r.max_basic },
    { key: 'intermedio', earned: r.score_intermediate, max: r.max_intermediate },
    { key: 'avanzado', earned: r.score_advanced, max: r.max_advanced },
  ];

  return (
    <div>
      <AdminNav />
      <Link href="/admin" className="mb-4 inline-block text-sm font-medium text-indigo-700 hover:underline">
        ← Volver al panel
      </Link>

      {/* Encabezado del candidato */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{r.candidate_name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {r.email} · {r.phone}
            </p>
            <p className="text-sm text-slate-500">Cargo: {r.position}</p>
            <p className="mt-1 text-xs text-slate-400">{fmtDate(r.submitted_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-indigo-700">{totalPct}%</p>
            <p className="text-sm text-slate-500">
              {r.total_earned}/{r.total_max} puntos
            </p>
            <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Clasificación: {classify(totalPct)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {levels.map(({ key, earned, max }) => {
            const p = pct(earned, max);
            return (
              <div key={key} className="rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-600">{levelLabel(key)}</span>
                  <span className="font-semibold">
                    {earned}/{max} ({p}%)
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resultado pregunta por pregunta (snapshot del envío) */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">Detalle pregunta por pregunta</h2>
      <div className="space-y-3">
        {r.results.map((res, i) => {
          const { given, correct } = labels(res);
          return (
            <div
              key={res.question_id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${res.ok ? 'border-emerald-200' : 'border-red-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-medium leading-relaxed text-slate-900">
                  <span className="mr-1 text-slate-400">{i + 1}.</span>
                  {res.text}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    res.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {res.ok ? '✓ Correcta' : '✗ Incorrecta'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className={`rounded-lg px-3 py-2 ${res.ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Respuesta del candidato
                  </p>
                  <p className="mt-1 text-slate-800">
                    {given.length > 0 ? given.join(' · ') : '— (sin respuesta)'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Respuesta correcta
                  </p>
                  <p className="mt-1 font-medium text-slate-800">{correct.join(' · ')}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Nivel {levelLabel(res.level)} · {res.earned}/{res.points} puntos
                </span>
              </div>
              {res.justification && (
                <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                  <strong>Justificación:</strong> {res.justification}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

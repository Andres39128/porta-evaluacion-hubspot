import Link from 'next/link';
import AdminNav from './admin-nav';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { classify, levelLabel } from '@/lib/types';
import { END_REASON_LABELS } from '@/lib/exam';
import type { EndReason } from '@/lib/exam';
import type { Level, SubmissionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SearchParams {
  from?: string;
  to?: string;
  sort?: string;
}

function pct(earned: number, max: number): number {
  return max > 0 ? Math.round((earned / max) * 100) : 0;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const badgeClass: Record<string, string> = {
  Básico: 'bg-slate-100 text-slate-700',
  Intermedio: 'bg-amber-100 text-amber-700',
  Avanzado: 'bg-emerald-100 text-emerald-700',
};

const endReasonClass: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-600',
  timeout: 'bg-blue-100 text-blue-700',
  left_screen: 'bg-amber-100 text-amber-700',
  offline: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = getSupabaseAdmin();

  let query = supabase.from('submissions').select('*').order('total_earned', { ascending: false });
  if (sp.from) query = query.gte('submitted_at', `${sp.from}T00:00:00`);
  if (sp.to) query = query.lte('submitted_at', `${sp.to}T23:59:59`);
  if (sp.sort === 'date') {
    query = supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
    if (sp.from) query = query.gte('submitted_at', `${sp.from}T00:00:00`);
    if (sp.to) query = query.lte('submitted_at', `${sp.to}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Error cargando resultados: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as SubmissionRow[];

  // Estadísticas
  const total = rows.length;
  const avgPct = total > 0 ? Math.round(rows.reduce((a, r) => a + pct(r.total_earned, r.total_max), 0) / total) : 0;
  const avgByLevel: Record<Level, number> = {
    basico: total > 0 ? Math.round(rows.reduce((a, r) => a + pct(r.score_basic, r.max_basic), 0) / total) : 0,
    intermedio: total > 0 ? Math.round(rows.reduce((a, r) => a + pct(r.score_intermediate, r.max_intermediate), 0) / total) : 0,
    avanzado: total > 0 ? Math.round(rows.reduce((a, r) => a + pct(r.score_advanced, r.max_advanced), 0) / total) : 0,
  };
  const dist = { Básico: 0, Intermedio: 0, Avanzado: 0 } as Record<string, number>;
  for (const r of rows) dist[classify(pct(r.total_earned, r.total_max))] += 1;

  const hasFilters = Boolean(sp.from || sp.to);

  return (
    <div>
      <AdminNav />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Panel de resultados</h1>
        <a
          href="/api/admin/export"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Exportar CSV
        </a>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total evaluaciones</p>
          <p className="mt-1 text-3xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Puntaje promedio</p>
          <p className="mt-1 text-3xl font-bold">{avgPct}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-sm text-slate-500">Promedio por nivel</p>
          <div className="mt-3 space-y-2">
            {(['basico', 'intermedio', 'avanzado'] as Level[]).map((lvl) => (
              <div key={lvl} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-slate-600">{levelLabel(lvl)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${avgByLevel[lvl]}%` }} />
                </div>
                <span className="w-10 text-right font-semibold">{avgByLevel[lvl]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Distribución por clasificación */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Distribución por clasificación</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['Básico', 'Intermedio', 'Avanzado'] as const).map((c) => (
            <div key={c} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass[c]}`}>{c}</span>
              <span className="text-xl font-bold">{dist[c]}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Clasificación sobre % total: ≥80% Avanzado · 50–79% Intermedio · &lt;50% Básico
        </p>
      </div>

      {/* Filtros */}
      <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <label className="block text-sm">
          <span className="font-medium text-slate-600">Desde</span>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ''}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-600">Hasta</span>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ''}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-600">Ordenar por</span>
          <select
            name="sort"
            defaultValue={sp.sort ?? 'score'}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5"
          >
            <option value="score">Puntaje (mayor primero)</option>
            <option value="date">Fecha (reciente primero)</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Aplicar
        </button>
        {hasFilters && (
          <Link href="/admin" className="text-sm font-medium text-slate-500 underline">
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla de candidatos */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Candidato</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-center">% Básico</th>
              <th className="px-4 py-3 text-center">% Intermedio</th>
              <th className="px-4 py-3 text-center">% Avanzado</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3">Clasificación</th>
              <th className="px-4 py-3">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  {hasFilters
                    ? 'No hay evaluaciones en el rango de fechas seleccionado.'
                    : 'Aún no hay evaluaciones enviadas.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const p = pct(r.total_earned, r.total_max);
                const c = classify(p);
                const reason = (r.end_reason ?? 'submitted') as EndReason;
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/${r.id}`} className="font-semibold text-indigo-700 hover:underline">
                        {r.candidate_name}
                      </Link>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(r.submitted_at)}</td>
                    <td className="px-4 py-3 text-center">{pct(r.score_basic, r.max_basic)}%</td>
                    <td className="px-4 py-3 text-center">{pct(r.score_intermediate, r.max_intermediate)}%</td>
                    <td className="px-4 py-3 text-center">{pct(r.score_advanced, r.max_advanced)}%</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {r.total_earned}/{r.total_max}
                      <span className="ml-1 text-slate-500">({p}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass[c]}`}>{c}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${endReasonClass[reason] ?? endReasonClass.submitted}`}>
                        {END_REASON_LABELS[reason]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

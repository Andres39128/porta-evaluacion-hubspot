import AdminNav from '../admin-nav';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { levelLabel } from '@/lib/types';
import type { Level, QuestionRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AnswerKeyPage() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Error cargando la clave: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as QuestionRow[];
  const byLevel: Record<Level, QuestionRow[]> = { basico: [], intermedio: [], avanzado: [] };
  for (const q of rows) byLevel[q.level].push(q);

  return (
    <div>
      <AdminNav />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Clave de respuestas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Solo visible en este panel. Ponderación: básico 1 pt · intermedio 2 pts · avanzado 3 pts.
      </p>

      {(['basico', 'intermedio', 'avanzado'] as Level[]).map((lvl) =>
        byLevel[lvl].length === 0 ? null : (
          <section key={lvl} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">
              Nivel {levelLabel(lvl)}{' '}
              <span className="text-sm font-normal text-slate-400">
                ({byLevel[lvl].length} preguntas)
              </span>
            </h2>
            <div className="space-y-3">
              {byLevel[lvl].map((q, i) => (
                <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-medium leading-relaxed text-slate-900">
                    <span className="mr-1 text-slate-400">{i + 1}.</span>
                    {q.text}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((opt, idx) => (
                      <li
                        key={`${q.id}-${idx}`}
                        className={
                          q.correct_answers.includes(idx)
                            ? 'font-semibold text-emerald-700'
                            : 'text-slate-600'
                        }
                      >
                        {q.correct_answers.includes(idx) ? '✓ ' : '· '}
                        {opt}
                      </li>
                    ))}
                  </ul>
                  {q.justification && (
                    <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                      <strong>Justificación:</strong> {q.justification}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}

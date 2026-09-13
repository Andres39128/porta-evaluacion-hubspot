import Link from 'next/link';
import AdminNav from '../admin-nav';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { levelLabel } from '@/lib/types';
import type { QuestionRow } from '@/lib/types';
import { deleteQuestionAction, saveQuestionAction, toggleQuestionAction } from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ edit?: string; ok?: string; error?: string }>;
}

const typeLabel: Record<string, string> = {
  single: 'Selección única',
  multiple: 'Selección múltiple',
  boolean: 'Verdadero / Falso',
};

export default async function QuestionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Error cargando preguntas: {error.message}
      </div>
    );
  }

  const questions = (data ?? []) as QuestionRow[];
  const editing = sp.edit ? questions.find((q) => q.id === sp.edit) : undefined;

  // Valores por defecto del formulario (crear o editar)
  const defaults = editing
    ? {
        id: editing.id,
        level: editing.level,
        type: editing.type,
        text: editing.text,
        options: editing.options.join('\n'),
        correct: editing.correct_answers.map((i) => i + 1).join(','),
        booleanCorrect: editing.correct_answers[0] === 0 ? 'true' : 'false',
        justification: editing.justification,
      }
    : {
        id: '',
        level: 'basico',
        type: 'single',
        text: '',
        options: '',
        correct: '',
        booleanCorrect: 'true',
        justification: '',
      };

  return (
    <div>
      <AdminNav />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Banco de preguntas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Los puntos se asignan automáticamente según el nivel (básico 1 · intermedio 2 · avanzado 3).
        Las preguntas inactivas no se muestran a los candidatos.
      </p>

      {sp.ok && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Pregunta guardada correctamente.
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {sp.error}
        </div>
      )}

      {/* Formulario crear / editar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? `Editar pregunta` : 'Nueva pregunta'}
          </h2>
          {editing && (
            <Link href="/admin/preguntas" className="text-sm font-medium text-indigo-700 hover:underline">
              Cancelar edición
            </Link>
          )}
        </div>

        <form action={saveQuestionAction} className="grid gap-4">
          <input type="hidden" name="id" value={defaults.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Nivel</span>
              <select
                name="level"
                defaultValue={defaults.level}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="basico">Básico (1 punto)</option>
                <option value="intermedio">Intermedio (2 puntos)</option>
                <option value="avanzado">Avanzado (3 puntos)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Tipo</span>
              <select
                name="type"
                defaultValue={defaults.type}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="single">Selección única</option>
                <option value="multiple">Selección múltiple</option>
                <option value="boolean">Verdadero / Falso</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Enunciado</span>
            <textarea
              name="text"
              required
              rows={2}
              defaultValue={defaults.text}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Ej: ¿Qué es una propiedad en HubSpot?"
            />
          </label>

          {/* El campo de opciones solo aplica a selección única/múltiple */}
          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              Opciones (una por línea, entre 2 y 6 — no aplica a verdadero/falso)
            </span>
            <textarea
              name="options"
              rows={4}
              defaultValue={defaults.options}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder={'Opción A\nOpción B\nOpción C'}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Respuesta correcta</span>
            <input
              name="correct"
              required
              defaultValue={
                editing?.type === 'boolean' ? defaults.booleanCorrect : defaults.correct
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder={
                'Selección: índice(s) separados por coma (ej: 2  o  1,3) · Verdadero/Falso: true o false'
              }
            />
            <span className="mt-1 block text-xs text-slate-500">
              Índices inician en 1 (1 = primera opción). Para múltiple: varias separadas por coma.
              Para verdadero/falso escribe <code>true</code> o <code>false</code>.
            </span>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Justificación (visible en el panel admin)</span>
            <textarea
              name="justification"
              rows={2}
              defaultValue={defaults.justification}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Explicación breve de la respuesta correcta"
            />
          </label>

          <button
            type="submit"
            className="justify-self-start rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            {editing ? 'Guardar cambios' : 'Crear pregunta'}
          </button>
        </form>
      </div>

      {/* Listado */}
      <div className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">
          Preguntas existentes <span className="text-sm font-normal text-slate-400">({questions.length})</span>
        </h2>
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                    {levelLabel(q.level)} · {q.points} pt
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                    {typeLabel[q.type]}
                  </span>
                  {!q.active && (
                    <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-600">
                      inactiva
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  <span className="text-slate-400">{i + 1}.</span> {q.text}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  ✓ {q.correct_answers.map((idx) => q.options[idx]).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/preguntas?edit=${q.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Editar
                </Link>
                <form action={toggleQuestionAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="active" value={String(q.active)} />
                  <button
                    type="submit"
                    className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    {q.active ? 'Desactivar' : 'Activar'}
                  </button>
                </form>
                <form action={deleteQuestionAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

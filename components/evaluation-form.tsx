'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Level, PublicQuestion, QuestionType } from '@/lib/types';
import { levelLabel } from '@/lib/types';

type Answers = Record<string, number[]>;

const SECTIONS: { level: Level; hint: string }[] = [
  { level: 'basico', hint: 'Conceptos fundamentales del CRM' },
  { level: 'intermedio', hint: 'Automatización, scoring y reportes' },
  { level: 'avanzado', hint: 'Integraciones, atribución y datos' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EvaluationForm() {
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'Analista de Datos y CRM',
  });
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoadError(false);
    setQuestions(null);
    try {
      const res = await fetch('/api/questions', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data: { questions: PublicQuestion[] } = await res.json();
      if (data.questions.length === 0) throw new Error();
      setQuestions(data.questions);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byLevel = useMemo(() => {
    const map: Record<Level, PublicQuestion[]> = {
      basico: [],
      intermedio: [],
      avanzado: [],
    };
    for (const q of questions ?? []) map[q.level].push(q);
    return map;
  }, [questions]);

  const total = questions?.length ?? 0;
  const answered = Object.keys(answers).length;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

  function toggleAnswer(q: PublicQuestion, index: number) {
    setAnswers((prev) => {
      if (q.type === 'multiple') {
        const current = prev[q.id] ?? [];
        const next = current.includes(index)
          ? current.filter((i) => i !== index)
          : [...current, index];
        const updated = { ...prev };
        if (next.length === 0) delete updated[q.id];
        else updated[q.id] = next;
        return updated;
      }
      return { ...prev, [q.id]: [index] };
    });
  }

  function validate(): string {
    if (form.name.trim().length < 3) return 'Ingresa tu nombre completo.';
    if (!EMAIL_RE.test(form.email.trim())) return 'Ingresa un correo válido.';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return 'Ingresa un teléfono válido.';
    if (!form.position.trim()) return 'Ingresa el cargo al que te postulas.';
    if (answered < total) {
      return `Faltan ${total - answered} pregunta(s) por responder. Revisa las secciones marcadas.`;
    }
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError(
          'Ya existe una evaluación registrada con este correo. Solo se permite un envío por candidato.'
        );
      } else if (!res.ok) {
        setError(data.error ?? 'No fue posible enviar la evaluación. Intenta de nuevo.');
      } else {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    }
    setSubmitting(false);
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-slate-800">No pudimos cargar la evaluación.</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
          ✓
        </div>
        <h2 className="mt-4 text-2xl font-bold text-emerald-900">Envío confirmado</h2>
        <p className="mx-auto mt-2 max-w-md text-emerald-800">
          Tu evaluación fue registrada correctamente. El equipo de selección recibió tus
          respuestas y te contactará con los siguientes pasos del proceso.
        </p>
        <p className="mt-4 text-sm text-emerald-700">¡Gracias por participar!</p>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        Cargando evaluación…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {/* Progreso */}
      <div className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">
            Progreso: {answered}/{total} respondidas
          </span>
          <span className="text-slate-500">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Datos del candidato */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Datos del candidato</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Nombre completo *</span>
            <input
              type="text"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ej: María Fernanda Gómez"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Correo electrónico *</span>
            <input
              type="email"
              required
              maxLength={160}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="tu@correo.com"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Teléfono *</span>
            <input
              type="tel"
              required
              maxLength={30}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="+57 300 000 0000"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Cargo al que se postula *</span>
            <input
              type="text"
              required
              maxLength={120}
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </div>
      </section>

      {/* Preguntas por sección */}
      {SECTIONS.map(({ level, hint }) =>
        byLevel[level].length === 0 ? null : (
          <section key={level} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">
                Nivel {levelLabel(level)}
              </h2>
              <p className="text-xs text-slate-500">{hint}</p>
            </div>
            {byLevel[level].map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i + 1}
                selected={answers[q.id] ?? []}
                onToggle={(idx) => toggleAnswer(q, idx)}
              />
            ))}
          </section>
        )
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Enviando…' : 'Enviar evaluación'}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Solo se permite un envío por correo. Verifica tus respuestas antes de enviar.
        </p>
      </div>
    </form>
  );
}

function QuestionCard({
  question,
  index,
  selected,
  onToggle,
}: {
  question: PublicQuestion;
  index: number;
  selected: number[];
  onToggle: (index: number) => void;
}) {
  const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="sr-only">Pregunta</legend>
      <p className="font-medium leading-relaxed text-slate-900">
        <span className="mr-1 text-slate-400">{index}.</span>
        {question.text}
        {question.type === 'multiple' && (
          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            múltiple
          </span>
        )}
      </p>
      <div className="mt-3 space-y-2">
        {question.options.map((opt, idx) => (
          <label
            key={`${question.id}-${idx}`}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
              selected.includes(idx)
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type={inputType}
              name={question.id}
              checked={selected.includes(idx)}
              onChange={() => onToggle(idx)}
              className="mt-0.5 h-4 w-4 accent-indigo-600"
            />
            <span className="text-slate-700">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

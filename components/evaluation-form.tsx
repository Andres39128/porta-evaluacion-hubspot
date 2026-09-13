'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Level, PublicQuestion } from '@/lib/types';
import { levelLabel } from '@/lib/types';
import { END_REASON_LABELS, EXAM_TIME_LIMIT_MINUTES, type EndReason } from '@/lib/exam';

type Phase = 'form' | 'starting' | 'exam' | 'ended';
type Answers = Record<string, number[]>;

interface StartResponse {
  sessionId: string;
  startedAt: string;
  serverTime: string;
  timeLimitMinutes: number;
  questions: PublicQuestion[];
}

const SECTIONS: { level: Level; hint: string }[] = [
  { level: 'basico', hint: 'Conceptos fundamentales del CRM' },
  { level: 'intermedio', hint: 'Automatización, scoring y reportes' },
  { level: 'avanzado', hint: 'Integraciones, atribución y datos' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function EvaluationForm() {
  const [phase, setPhase] = useState<Phase>('form');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'Analista de Datos y CRM',
  });
  const [exam, setExam] = useState<StartResponse | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [endReason, setEndReason] = useState<EndReason>('submitted');

  // Refs espejo para los listeners de cierre (evitan closures obsoletas).
  const answersRef = useRef<Answers>({});
  const finishedRef = useRef(false);
  const pendingRef = useRef<string | null>(null); // payload sin enviar (offline)
  const finalizeRef = useRef<(r: EndReason, beacon?: boolean) => void>(() => {});

  const questions = exam?.questions ?? [];
  const byLevel = useMemo(() => {
    const map: Record<Level, PublicQuestion[]> = {
      basico: [],
      intermedio: [],
      avanzado: [],
    };
    for (const q of questions) map[q.level].push(q);
    return map;
  }, [questions]);

  const answered = Object.keys(answers).length;
  const total = questions.length;

  function updateAnswers(next: Answers) {
    answersRef.current = next;
    setAnswers(next);
  }

  function toggleAnswer(q: PublicQuestion, index: number) {
    const prev = answersRef.current;
    let next: Answers;
    if (q.type === 'multiple') {
      const current = prev[q.id] ?? [];
      const list = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      next = { ...prev };
      if (list.length === 0) delete next[q.id];
      else next[q.id] = list;
    } else {
      next = { ...prev, [q.id]: [index] };
    }
    updateAnswers(next);
  }

  /** Envía el cierre del examen (normal, timeout, abandono, offline). Idempotente en servidor. */
  const finalize = useCallback(
    (reason: EndReason, useBeacon = false) => {
      if (finishedRef.current || !exam) return;
      finishedRef.current = true;

      const payload = JSON.stringify({
        sessionId: exam.sessionId,
        answers: answersRef.current,
        endReason: reason,
      });

      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(
            '/api/submissions',
            new Blob([payload], { type: 'application/json' })
          );
        } catch {
          pendingRef.current = payload;
        }
      } else {
        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Sin conexión: se reintenta al volver internet o al cerrar la pestaña.
          pendingRef.current = payload;
        });
      }

      setEndReason(reason);
      setPhase('ended');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [exam]
  );

  useEffect(() => {
    finalizeRef.current = finalize;
  }, [finalize]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 3) return setError('Ingresa tu nombre completo.');
    if (!EMAIL_RE.test(form.email.trim())) return setError('Ingresa un correo válido.');
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return setError('Ingresa un teléfono válido.');
    if (!form.position.trim()) return setError('Ingresa el cargo al que te postulas.');

    setPhase('starting');
    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError(data.error ?? 'Ya existe una evaluación registrada con este correo.');
        setPhase('form');
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'No fue posible iniciar la evaluación. Intenta de nuevo.');
        setPhase('form');
        return;
      }
      setExam(data as StartResponse);
      finishedRef.current = false;
      updateAnswers({});
      setPhase('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setPhase('form');
    }
  }

  function handleSubmitExam() {
    const missing = total - answered;
    if (missing > 0) {
      const ok = window.confirm(
        `Tienes ${missing} pregunta(s) sin responder. ¿Deseas enviar la evaluación así?`
      );
      if (!ok) return;
    }
    finalize('submitted');
  }

  // Cronómetro + detectores de abandono (solo durante el examen).
  useEffect(() => {
    if (phase !== 'exam' || !exam) return;

    // Reloj contra el servidor: recargar la página no reinicia el tiempo.
    const offset = Date.now() - new Date(exam.serverTime).getTime();
    const deadline =
      new Date(exam.startedAt).getTime() + exam.timeLimitMinutes * 60_000 + offset;

    const tick = () => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) finalizeRef.current('timeout');
    };
    tick();
    const interval = setInterval(tick, 1000);

    const onVisibility = () => {
      if (document.hidden) finalizeRef.current('left_screen', true);
    };
    const onOffline = () => finalizeRef.current('offline');
    const onPageHide = () => {
      // Cierre de pestaña: si quedó un payload sin enviar (offline), va por beacon.
      if (pendingRef.current && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/submissions',
          new Blob([pendingRef.current], { type: 'application/json' })
        );
        pendingRef.current = null;
      }
    };
    const onOnline = () => {
      if (pendingRef.current) {
        const payload = pendingRef.current;
        pendingRef.current = null;
        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          pendingRef.current = payload;
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
    };
  }, [phase, exam]);

  // ---------- Pantallas ----------

  if (phase === 'ended') {
    return <EndedScreen reason={endReason} />;
  }

  if (phase === 'form' || phase === 'starting') {
    return (
      <form onSubmit={handleStart} className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

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

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900">Reglas de la evaluación</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900">
            <li>
              ⏱️ Tienes <strong>{exam ? exam.timeLimitMinutes : EXAM_TIME_LIMIT_MINUTES} minutos</strong> cronometrados
              desde que presionas «Comenzar». Al agotarse, la evaluación se envía automáticamente
              con lo que hayas respondido.
            </li>
            <li>
              🚫 Si cambias de pestaña, minimizas la ventana o te desconectas,{' '}
              <strong>el examen se cierra automáticamente</strong> y se califica con las
              respuestas registradas hasta ese momento.
            </li>
            <li>✉️ Un solo intento por correo electrónico.</li>
            <li>✍️ Puedes enviar antes de tiempo cuando termines.</li>
          </ul>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            type="submit"
            disabled={phase === 'starting'}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === 'starting' ? 'Comenzando…' : 'Comenzar (el cronómetro inicia ahora)'}
          </button>
        </div>
      </form>
    );
  }

  // phase === 'exam'
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;
  const lowTime = remaining <= 300;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-700">
            Respondidas: {answered}/{total}
          </span>
          <span
            className={`rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums ${
              lowTime ? 'animate-pulse bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
            }`}
            aria-live="polite"
          >
            ⏱ {fmtTime(remaining)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {SECTIONS.map(({ level, hint }) =>
        byLevel[level].length === 0 ? null : (
          <section key={level} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Nivel {levelLabel(level)}</h2>
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
          type="button"
          onClick={handleSubmitExam}
          className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Enviar evaluación
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Quedan {total - answered} sin responder. No salgas de esta pantalla: el examen se
          cierra automáticamente.
        </p>
      </div>
    </div>
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

function EndedScreen({ reason }: { reason: EndReason }) {
  if (reason === 'submitted') {
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

  const config: Record<
    Exclude<EndReason, 'submitted'>,
    { title: string; message: string }
  > = {
    timeout: {
      title: 'Tiempo agotado',
      message:
        'Se alcanzó el tiempo máximo de la evaluación. Tus respuestas fueron enviadas y calificadas con lo registrado hasta este momento.',
    },
    left_screen: {
      title: 'Evaluación cerrada',
      message:
        'El examen se cerró porque saliste de la pantalla (cambio de pestaña o minimización). Se calificó con las respuestas registradas hasta ese momento.',
    },
    offline: {
      title: 'Evaluación cerrada',
      message:
        'El examen se cerró porque te desconectaste. Se calificó con las respuestas registradas hasta ese momento.',
    },
    expired: {
      title: 'Sesión expirada',
      message: 'Tu sesión expiró sin envío. Contacta al equipo de selección.',
    },
  };

  const { title, message } = config[reason];

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-2xl text-white">
        !
      </div>
      <h2 className="mt-4 text-2xl font-bold text-amber-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-amber-800">{message}</p>
      <p className="mt-4 text-sm text-amber-700">
        Si crees que fue un error, contacta al equipo de selección del Politécnico
        Internacional.
      </p>
      <p className="mt-2 text-xs text-amber-600">
        Registro de cierre: {END_REASON_LABELS[reason]}
      </p>
    </div>
  );
}

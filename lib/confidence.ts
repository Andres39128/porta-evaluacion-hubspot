// Índice de confiabilidad del intento — NO mide conocimiento (eso lo mide el
// puntaje), mide si el puntaje es confiable como evidencia. Se calcula en
// lectura desde el snapshot (results + tiempo + motivo) así funciona
// retroactivamente y mejora cuando el algoritmo mejora.
//
// Base 75 · hasta +20 por completitud y envío normal · penalizaciones por banderas.
// Nivel: ≥75 Confiable · 45–74 Revisar · <45 Sospechoso.

import type { EndReason } from './exam';
import type { Level, QuestionResult } from './types';

export interface ConfidenceFlag {
  code: string;
  label: string;
  detail: string;
  penalty: number;
}

export interface ConfidenceResult {
  score: number;
  level: 'Confiable' | 'Revisar' | 'Sospechoso';
  answered: number;
  total: number;
  completion: number; // 0..1
  accuracy: number; // 0..1 sobre respondidas
  flags: ConfidenceFlag[];
}

/** Promedio de segundos por pregunta respondida bajo el cual es humanamente implausible acertar ≥90%. */
const IMPOSSIBLE_SECONDS_PER_QUESTION = 12;

export function computeConfidence(
  results: QuestionResult[],
  elapsedSeconds: number | null,
  endReason: EndReason | string
): ConfidenceResult {
  const total = results.length;
  const answered = results.filter((r) => r.given.length > 0).length;
  const correct = results.filter((r) => r.ok).length;
  const completion = total > 0 ? answered / total : 0;
  const accuracy = answered > 0 ? correct / answered : 0;

  const flags: ConfidenceFlag[] = [];

  // 1. Acierto perfecto sobre una muestra suficiente (bandera suave).
  if (accuracy === 1 && answered >= 5) {
    flags.push({
      code: 'perfect_accuracy',
      label: 'Acierto perfecto',
      detail: `Respondió ${answered} preguntas y acertó todas. Puede ser expertise real: verificar los temas en entrevista.`,
      penalty: 10,
    });
  }

  // 2. Alta precisión con baja cobertura: patrón compatible con consulta externa lenta.
  if (accuracy >= 0.9 && completion <= 0.6 && answered >= 5) {
    flags.push({
      code: 'high_accuracy_low_completion',
      label: 'Mucha precisión, poca cobertura',
      detail: `Acierto ≥90% en solo ${answered} de ${total} preguntas. Consistente con consulta externa que no alcanzó a cubrir todo el examen.`,
      penalty: 30,
    });
  }

  // 3. Velocidad implausible con alta precisión (clave compartida / respuesta automática).
  if (
    elapsedSeconds !== null &&
    answered >= 8 &&
    accuracy >= 0.9 &&
    elapsedSeconds / answered < IMPOSSIBLE_SECONDS_PER_QUESTION
  ) {
    flags.push({
      code: 'impossible_speed',
      label: 'Velocidad implausible',
      detail: `Promedio de ${(elapsedSeconds / answered).toFixed(1)}s por pregunta respondida con ≥90% de acierto (umbral: ${IMPOSSIBLE_SECONDS_PER_QUESTION}s).`,
      penalty: 35,
    });
  }

  // 4. Niveles invertidos: rinde más en avanzado que en básico (atípico).
  const byLevel = (lvl: Level) => {
    const rs = results.filter((r) => r.level === lvl && r.given.length > 0);
    return { answered: rs.length, accuracy: rs.length > 0 ? rs.filter((r) => r.ok).length / rs.length : 0 };
  };
  const basic = byLevel('basico');
  const advanced = byLevel('avanzado');
  if (basic.answered >= 2 && advanced.answered >= 2 && advanced.accuracy > basic.accuracy + 0.25) {
    flags.push({
      code: 'inverted_levels',
      label: 'Niveles invertidos',
      detail: `Acierto avanzado (${Math.round(advanced.accuracy * 100)}%) muy superior al básico (${Math.round(basic.accuracy * 100)}%). Patrón atípico: lo normal es decrecer con la dificultad.`,
      penalty: 15,
    });
  }

  let score = 75;
  if (completion >= 0.9) score += 15;
  else if (completion >= 0.7) score += 8;
  if (endReason === 'submitted') score += 5;
  score -= flags.reduce((acc, f) => acc + f.penalty, 0);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const level: ConfidenceResult['level'] =
    score >= 75 ? 'Confiable' : score >= 45 ? 'Revisar' : 'Sospechoso';

  return { score, level, answered, total, completion, accuracy, flags };
}

export const CONFIDENCE_BADGE_CLASS: Record<ConfidenceResult['level'], string> = {
  Confiable: 'bg-emerald-100 text-emerald-700',
  Revisar: 'bg-amber-100 text-amber-700',
  Sospechoso: 'bg-red-100 text-red-700',
};

import type { Level, QuestionResult, QuestionRow } from './types';

export interface GradeSummary {
  results: QuestionResult[];
  score_basic: number;
  score_intermediate: number;
  score_advanced: number;
  max_basic: number;
  max_intermediate: number;
  max_advanced: number;
  total_earned: number;
  total_max: number;
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

const levelField = {
  basico: { earned: 'score_basic', max: 'max_basic' },
  intermedio: { earned: 'score_intermediate', max: 'max_intermediate' },
  avanzado: { earned: 'score_advanced', max: 'max_advanced' },
} as const;

/**
 * Califica un envío contra el banco activo. SOLO servidor.
 * Selección múltiple: puntos completos solo con el conjunto exacto (sin parcial).
 */
export function gradeSubmission(
  questions: QuestionRow[],
  answers: Record<string, number[]>
): GradeSummary {
  const summary: GradeSummary = {
    results: [],
    score_basic: 0,
    score_intermediate: 0,
    score_advanced: 0,
    max_basic: 0,
    max_intermediate: 0,
    max_advanced: 0,
    total_earned: 0,
    total_max: 0,
  };

  for (const q of questions) {
    const given = answers[q.id] ?? [];
    const ok = given.length > 0 && sameSet(given, q.correct_answers);
    const earned = ok ? q.points : 0;
    const fields = levelField[q.level];

    summary[fields.earned] += earned;
    summary[fields.max] += q.points;
    summary.total_earned += earned;
    summary.total_max += q.points;

    summary.results.push({
      question_id: q.id,
      text: q.text,
      options: q.options,
      level: q.level as Level,
      points: q.points,
      given,
      correct: q.correct_answers,
      ok,
      earned,
      justification: q.justification,
    });
  }

  return summary;
}

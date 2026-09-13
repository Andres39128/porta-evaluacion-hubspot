export type Level = 'basico' | 'intermedio' | 'avanzado';
export type QuestionType = 'single' | 'multiple' | 'boolean';

/** Fila completa de la tabla questions — SOLO servidor. Nunca enviar al cliente. */
export interface QuestionRow {
  id: string;
  level: Level;
  type: QuestionType;
  text: string;
  options: string[];
  correct_answers: number[];
  points: number;
  justification: string;
  active: boolean;
  created_at: string;
}

/** Pregunta sin respuesta correcta — lo único que ve el candidato. */
export interface PublicQuestion {
  id: string;
  level: Level;
  type: QuestionType;
  text: string;
  options: string[];
}

/** Snapshot por pregunta guardado en cada envío (estable aunque el banco cambie). */
export interface QuestionResult {
  question_id: string;
  text: string;
  options: string[];
  level: Level;
  points: number;
  given: number[];
  correct: number[];
  ok: boolean;
  earned: number;
  justification: string;
}

export interface SubmissionRow {
  id: string;
  candidate_name: string;
  email: string;
  phone: string;
  position: string;
  answers: Record<string, number[]>;
  results: QuestionResult[];
  score_basic: number;
  score_intermediate: number;
  score_advanced: number;
  max_basic: number;
  max_intermediate: number;
  max_advanced: number;
  total_earned: number;
  total_max: number;
  submitted_at: string;
}

export const LEVELS: { key: Level; label: string; points: number }[] = [
  { key: 'basico', label: 'Básico', points: 1 },
  { key: 'intermedio', label: 'Intermedio', points: 2 },
  { key: 'avanzado', label: 'Avanzado', points: 3 },
];

export function levelLabel(level: Level): string {
  return level === 'basico' ? 'Básico' : level === 'intermedio' ? 'Intermedio' : 'Avanzado';
}

export function pointsForLevel(level: Level): number {
  return level === 'basico' ? 1 : level === 'intermedio' ? 2 : 3;
}

/** Clasificación global del candidato según % total. Umbrales documentados en README. */
export function classify(totalPct: number): 'Básico' | 'Intermedio' | 'Avanzado' {
  if (totalPct >= 80) return 'Avanzado';
  if (totalPct >= 50) return 'Intermedio';
  return 'Básico';
}

// Check ejecutable de la lógica de calificación: node scripts/test-grading.mts
import assert from 'node:assert/strict';
import { gradeSubmission } from '../lib/grading.ts';
import type { QuestionRow } from '../lib/types.ts';

function q(over: Partial<QuestionRow>): QuestionRow {
  return {
    id: 'x',
    level: 'basico',
    type: 'single',
    text: 'pregunta',
    options: ['a', 'b'],
    correct_answers: [0],
    points: 1,
    justification: '',
    active: true,
    created_at: '',
    ...over,
  };
}

const bank: QuestionRow[] = [
  q({ id: 'b1', level: 'basico', points: 1, correct_answers: [1] }),
  q({ id: 'i1', level: 'intermedio', points: 2, correct_answers: [0] }),
  q({
    id: 'a1',
    level: 'avanzado',
    type: 'multiple',
    options: ['x', 'y', 'z'],
    correct_answers: [0, 2],
    points: 3,
  }),
];

// 1. Todo correcto; la múltiple en distinto orden (comparación por conjunto)
const g1 = gradeSubmission(bank, { b1: [1], i1: [0], a1: [2, 0] });
assert.equal(g1.score_basic, 1);
assert.equal(g1.score_intermediate, 2);
assert.equal(g1.score_advanced, 3);
assert.equal(g1.total_earned, 6);
assert.equal(g1.total_max, 6);
assert.ok(g1.results.every((r) => r.ok));

// 2. Múltiple parcial (subconjunto) = 0 puntos, sin parcial
const g2 = gradeSubmission(bank, { b1: [1], i1: [0], a1: [0] });
assert.equal(g2.total_earned, 3);
assert.equal(g2.results.find((r) => r.question_id === 'a1')!.earned, 0);

// 3. Múltiple con extra erróneo = 0 puntos
const g3 = gradeSubmission(bank, { b1: [1], i1: [0], a1: [0, 1, 2] });
assert.equal(g3.total_earned, 3);

// 4. Sin respuestas / vacío
const g4 = gradeSubmission(bank, {});
assert.equal(g4.total_earned, 0);
assert.equal(g4.total_max, 6);
assert.ok(g4.results.every((r) => !r.ok && r.given.length === 0));

// 5. Snapshot estable: texto y opciones quedan en results
assert.equal(g1.results.find((r) => r.question_id === 'a1')!.options.length, 3);

console.log('✓ grading: 5 casos OK');

// Check ejecutable del índice de confiabilidad: node scripts/test-confidence.mts
import assert from 'node:assert/strict';
import { computeConfidence } from '../lib/confidence.ts';
import type { QuestionResult } from '../lib/types.ts';

function results(pattern: ('ok' | 'wrong' | 'skip')[], level = 'basico'): QuestionResult[] {
  return pattern.map((p, i) => ({
    question_id: `q${i}`,
    text: `pregunta ${i}`,
    options: ['a', 'b'],
    level,
    points: 1,
    given: p === 'skip' ? [] : [0],
    correct: [0],
    ok: p === 'ok',
    earned: p === 'ok' ? 1 : 0,
    justification: '',
  }));
}

const N = 22;

// 1. Intento honesto completo con errores normales → Confiable alto, sin banderas
const r1 = computeConfidence(
  results(Array(16).fill('ok').concat(Array(6).fill('wrong')) as never, 'basico').length === N
    ? results(Array(16).fill('ok').concat(Array(6).fill('wrong')) as never)
    : results(Array(22).fill('ok')),
  900,
  'submitted'
);
assert.equal(r1.answered, 22);
assert.equal(r1.flags.length, 0);
assert.equal(r1.level, 'Confiable');
console.log(`1. honesto completo: ${r1.score} ${r1.level} (banderas: 0) ✓`);

// 2. Perfecto y completo, velocidad razonable (25s/preg) → solo bandera suave
const r2 = computeConfidence(results(Array(22).fill('ok')), 550, 'submitted');
assert.ok(r2.flags.some((f) => f.code === 'perfect_accuracy'));
assert.ok(!r2.flags.some((f) => f.code === 'impossible_speed'));
assert.equal(r2.level, 'Confiable');
console.log(`2. experto perfecto: ${r2.score} ${r2.level} (bandera suave) ✓`);

// 3. Trampa clásica: 8/22 respondidas, TODO correcto, timeout (consulta externa lenta)
const pat3 = Array(8).fill('ok').concat(Array(14).fill('skip'));
const r3 = computeConfidence(results(pat3 as never), 1100, 'timeout');
assert.ok(r3.flags.some((f) => f.code === 'high_accuracy_low_completion'));
assert.ok(r3.flags.some((f) => f.code === 'perfect_accuracy'));
assert.equal(r3.level, 'Sospechoso');
console.log(`3. precision alta + cobertura baja: ${r3.score} ${r3.level} ✓`);

// 4. Velocidad imposible: 15/22 correctas en 150s (10s/preg)
const pat4 = Array(15).fill('ok').concat(Array(7).fill('skip'));
const r4 = computeConfidence(results(pat4 as never), 150, 'submitted');
assert.ok(r4.flags.some((f) => f.code === 'impossible_speed'));
console.log(`4. velocidad imposible: ${r4.score} ${r4.level} ✓`);

// 5. Niveles invertidos: básico 50% vs avanzado 100%
const basic = results(Array(2).fill('ok').concat(Array(2).fill('wrong')) as never, 'basico');
const advanced = results(Array(4).fill('ok'), 'avanzado').map((r, i) => ({ ...r, question_id: `a${i}` }));
const filler = results(Array(14).fill('skip') as never, 'intermedio').map((r, i) => ({ ...r, question_id: `i${i}` }));
const r5 = computeConfidence([...basic, ...advanced, ...filler], 800, 'submitted');
assert.ok(r5.flags.some((f) => f.code === 'inverted_levels'));
console.log(`5. niveles invertidos: ${r5.score} ${r5.level} (bandera detectada) ✓`);

// 6. Sin tiempo registrado (filas viejas) → no explota ni aplica bandera de velocidad
const r6 = computeConfidence(results(Array(22).fill('ok')), null, 'submitted');
assert.ok(!r6.flags.some((f) => f.code === 'impossible_speed'));
console.log(`6. elapsed null: ${r6.score} ${r6.level} ✓`);

console.log('\n✓ confiabilidad: 6 casos OK');

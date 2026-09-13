'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient, getSupabaseAdmin } from '@/lib/supabase/server';
import { pointsForLevel, type Level, type QuestionType } from '@/lib/types';

// ---------- Auth ----------

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Ingresa correo y contraseña.' };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: 'Credenciales inválidas.' };
  redirect('/admin');
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ---------- CRUD preguntas ----------

function parseQuestionForm(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const level = String(formData.get('level') ?? '') as Level;
  const type = String(formData.get('type') ?? '') as QuestionType;
  const text = String(formData.get('text') ?? '').trim();
  const justification = String(formData.get('justification') ?? '').trim();
  const optionsText = String(formData.get('options') ?? '');
  const correctText = String(formData.get('correct') ?? '');

  if (!['basico', 'intermedio', 'avanzado'].includes(level)) return { error: 'Nivel inválido.' };
  if (!['single', 'multiple', 'boolean'].includes(type)) return { error: 'Tipo inválido.' };
  if (text.length < 10 || text.length > 1000) return { error: 'Enunciado inválido (mínimo 10 caracteres).' };
  if (justification.length > 1000) return { error: 'Justificación demasiado larga.' };

  let options: string[];
  if (type === 'boolean') {
    options = ['Verdadero', 'Falso'];
  } else {
    options = optionsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (options.length < 2 || options.length > 6) {
      return { error: 'Escribe entre 2 y 6 opciones (una por línea).' };
    }
  }

  let correct: number[];
  if (type === 'boolean') {
    const v = correctText.trim().toLowerCase();
    const isTrue = v === 'true' || v === 'verdadero' || v === '1';
    const isFalse = v === 'false' || v === 'falso' || v === '2';
    if (!isTrue && !isFalse) return { error: 'Para verdadero/falso escribe true o false.' };
    correct = [isTrue ? 0 : 1];
  } else {
    correct = correctText
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((n) => Number(n));
    if (correct.some((n) => !Number.isInteger(n) || n < 1 || n > options.length)) {
      return { error: 'Respuestas correctas: índices entre 1 y el número de opciones, separados por coma.' };
    }
    correct = correct.map((n) => n - 1); // a base 0
    if (correct.length !== new Set(correct).size) {
      return { error: 'Índices duplicados en respuestas correctas.' };
    }
  }

  if (type !== 'multiple' && correct.length !== 1) {
    return { error: 'Las preguntas de selección única aceptan exactamente una respuesta correcta.' };
  }
  if (type === 'multiple' && correct.length < 1) {
    return { error: 'Selecciona al menos una respuesta correcta.' };
  }

  return {
    data: {
      id: id || undefined,
      level,
      type,
      text,
      options,
      correct_answers: correct,
      points: pointsForLevel(level),
      justification,
    },
  };
}

export async function saveQuestionAction(formData: FormData) {
  const parsed = parseQuestionForm(formData);
  if ('error' in parsed && parsed.error) {
    redirect(`/admin/preguntas?error=${encodeURIComponent(parsed.error)}`);
  }
  if (!('data' in parsed) || !parsed.data) {
    redirect('/admin/preguntas?error=Error%20inesperado');
  }
  const q = parsed.data;
  const supabase = getSupabaseAdmin();

  const { error } = q.id
    ? await supabase.from('questions').update({
        level: q.level,
        type: q.type,
        text: q.text,
        options: q.options,
        correct_answers: q.correct_answers,
        points: q.points,
        justification: q.justification,
      }).eq('id', q.id)
    : await supabase.from('questions').insert({
        level: q.level,
        type: q.type,
        text: q.text,
        options: q.options,
        correct_answers: q.correct_answers,
        points: q.points,
        justification: q.justification,
      });

  if (error) {
    console.error('saveQuestionAction:', error.message);
    redirect(`/admin/preguntas?error=${encodeURIComponent('Error guardando la pregunta.')}`);
  }

  revalidatePath('/admin/preguntas');
  revalidatePath('/admin/clave');
  revalidatePath('/api/questions');
  redirect('/admin/preguntas?ok=1');
}

export async function toggleQuestionAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('questions').update({ active: !active }).eq('id', id);
  if (error) console.error('toggleQuestionAction:', error.message);
  revalidatePath('/admin/preguntas');
  revalidatePath('/api/questions');
}

export async function deleteQuestionAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) console.error('deleteQuestionAction:', error.message);
  revalidatePath('/admin/preguntas');
  revalidatePath('/admin/clave');
  revalidatePath('/api/questions');
}

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { PublicQuestion } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Preguntas públicas: NUNCA incluye correct_answers ni justification.
 * Solo ids, enunciados, opciones, tipo y nivel.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('questions')
      .select('id, level, type, text, options')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('GET /api/questions:', error.message);
      return NextResponse.json({ error: 'Error cargando la evaluación.' }, { status: 500 });
    }

    return NextResponse.json({ questions: (data ?? []) as PublicQuestion[] });
  } catch (e) {
    console.error('GET /api/questions:', e);
    return NextResponse.json({ error: 'Error cargando la evaluación.' }, { status: 500 });
  }
}

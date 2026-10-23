import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from('analisis')
    .select('id, tipo_analisis, estado, resultado_resumen, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'No se pudo cargar el historial.' }, { status: 500 });
  }
  return NextResponse.json({ analisis: data });
}

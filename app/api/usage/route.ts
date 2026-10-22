import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from('users')
    .select('plan, creditos_usados, creditos_limite, active_until')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'No se pudo leer el saldo de créditos.' }, { status: 500 });
  }
  return NextResponse.json(data);
}

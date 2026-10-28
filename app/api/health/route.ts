import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ruta pública sin sesión, pensada para un cron externo que mantenga el
// proyecto de Supabase con actividad real (evita la pausa por inactividad del
// plan gratuito) — por eso hace una consulta real a la base, no solo responde
// un JSON fijo. No expone datos ni toca la API de Anthropic.
export async function GET() {
  const admin = createAdminClient();
  const { error } = await admin.from('users').select('id', { count: 'exact', head: true });
  return NextResponse.json({ ok: !error, dbError: error?.message ?? null, checkedAt: new Date().toISOString() });
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ruta pública sin sesión, pensada para un cron externo que mantenga el futuro
// proyecto de Supabase con actividad real (evita la pausa por inactividad del
// plan gratuito). No expone datos ni toca la API de Anthropic.
export async function GET() {
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}

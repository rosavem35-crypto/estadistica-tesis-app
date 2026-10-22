import { NextResponse } from 'next/server';

// Placeholder: la Fase 3 del plan (/root/.claude/plans/wild-sprouting-crystal.md)
// agrega aquí el guard real de sesión (mismo patrón que marco-teorico-app:
// lib/supabase/middleware.ts + updateSession). Por ahora no hay auth ni rutas
// protegidas, así que el matcher no coincide con nada.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

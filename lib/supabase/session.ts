import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './client';
import { hasActiveAccess } from '@/lib/access';

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Verifica sesión + acceso activo. Cada API route la llama al inicio:
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   const { supabase, user } = auth;
 * El middleware (UX) redirige antes de llegar aquí, pero esta función es la
 * que de verdad hace cumplir el acceso — nunca confiar solo en el middleware.
 */
export async function requireUser(): Promise<AuthContext | NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }
  const { data: fila } = await supabase
    .from('users')
    .select('active_until')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!hasActiveAccess(fila?.active_until)) {
    return NextResponse.json(
      { error: 'Tu acceso no está activo. Compra o renueva para seguir analizando.', code: 'sin_acceso' },
      { status: 403 }
    );
  }
  return { supabase, user: data.user };
}

/** Verifica que el análisis con ese id pertenezca al usuario autenticado. */
export async function ensureOwnsAnalisis(
  supabase: SupabaseClient,
  userId: string,
  analisisId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('analisis')
    .select('id')
    .eq('id', analisisId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

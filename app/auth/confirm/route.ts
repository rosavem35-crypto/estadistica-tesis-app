import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/access';

const VALID_TYPES: EmailOtpType[] = ['email', 'invite', 'magiclink', 'recovery', 'signup'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type');
  const next = safeRedirectPath(url.searchParams.get('next'), '/subir');

  const type = VALID_TYPES.find((t) => t === typeParam);
  if (token_hash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL('/iniciar-sesion?error=enlace_invalido', url.origin));
}

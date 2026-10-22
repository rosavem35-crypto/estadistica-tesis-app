import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/access';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeRedirectPath(url.searchParams.get('next'), '/subir');

  if (code) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

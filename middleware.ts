import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { safeRedirectPath } from '@/lib/access';

const RUTAS_PROTEGIDAS = ['/subir', '/analisis', '/historial'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const protegida = RUTAS_PROTEGIDAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (protegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/iniciar-sesion';
    url.search = `?next=${encodeURIComponent(safeRedirectPath(pathname))}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/webhooks/hotmart|api/health|auth|iniciar-sesion|sin-acceso|$).*)'],
};

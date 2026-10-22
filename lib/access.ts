/**
 * Helpers puros, sin dependencias de framework ni de Supabase — fáciles de
 * testear sin mocks. Mismo patrón que marco-teorico-app/lib/access.ts.
 */

export function hasActiveAccess(activeUntil: string | null | undefined, now: Date = new Date()): boolean {
  if (!activeUntil) return false;
  const fecha = new Date(activeUntil);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha.getTime() > now.getTime();
}

/** Evita redirecciones abiertas (`?next=//evil.com` o `?next=\\evil.com`). */
export function safeRedirectPath(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
  return path;
}

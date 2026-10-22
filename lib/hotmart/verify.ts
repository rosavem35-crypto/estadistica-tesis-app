import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Acepta el Hottok directo (modelo simple de Hotmart) o una firma
 * HMAC-SHA256 del cuerpo crudo (con o sin prefijo "sha256="). Mismo patrón
 * que marco-teorico-app/lib/hotmart/verify.ts.
 */
export function verifyHotmartSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | null | undefined
): boolean {
  if (!signatureHeader || !secret) return false;
  const provided = signatureHeader.trim();
  if (safeEqual(provided, secret.trim())) return true;
  const hmac = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(provided.replace(/^sha256=/, ''), hmac);
}

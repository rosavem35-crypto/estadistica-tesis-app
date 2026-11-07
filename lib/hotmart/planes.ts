/**
 * Planes de ESTE producto (estadistica-tesis-app) — independientes de los
 * de marco-teorico-app.
 *
 * Modelo de negocio: pago único + acceso de por vida. Los créditos se
 * consumen (1 análisis = 1 crédito) y se pueden recargar.
 *
 *   Investigador:     $29 USD → 30 análisis  (oferta base / default)
 *   Investigador Pro: $49 USD → 80 análisis  (oferta "Investigador Pro")
 *   Recarga:          $5 USD  → 10 análisis  (oferta "Recarga de créditos")
 *
 * Como los 3 precios son ofertas dentro de un MISMO producto de Hotmart
 * (ID 8881343), se distinguen por el código de oferta
 * (data.purchase.offer.code), no por product ID.
 */
export type Plan = 'basico' | 'pro' | 'recarga';

export const PLAN_LABELS: Record<Plan, string> = {
  basico: 'Investigador',
  pro: 'Investigador Pro',
  recarga: 'Recarga',
};

export const PLAN_LIMITS: Record<Plan, { creditosLimite: number }> = {
  basico: { creditosLimite: 30 },
  pro: { creditosLimite: 80 },
  recarga: { creditosLimite: 10 },
};

/**
 * Determina el plan a partir de:
 *   1. Offer code (prioridad) — distingue ofertas dentro del mismo producto
 *   2. Product ID (fallback) — por si se usan productos separados
 *
 * Cualquier compra que no matchee con pro ni recarga se trata como 'basico'.
 */
export function planFromProduct(
  productId: string | number | null | undefined,
  proIds: string,
  recargaIds?: string,
  offerCode?: string | null,
): Plan {
  const offer = offerCode ? offerCode.trim().toLowerCase() : '';
  const id = productId != null ? String(productId).trim().toLowerCase() : '';

  const proList = proIds.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if ((offer && proList.includes(offer)) || (id && proList.includes(id))) return 'pro';

  if (recargaIds) {
    const recargaList = recargaIds.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if ((offer && recargaList.includes(offer)) || (id && recargaList.includes(id))) return 'recarga';
  }

  return 'basico';
}

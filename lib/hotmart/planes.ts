/**
 * Planes de ESTE producto (estadistica-tesis-app) — independientes de los
 * de marco-teorico-app.
 *
 * Modelo de negocio: pago único + acceso de por vida. Los créditos se
 * consumen (1 análisis = 1 crédito) y se pueden recargar.
 *
 *   Investigador:     $29 USD → 30 análisis
 *   Investigador Pro: $49 USD → 80 análisis
 *   Recarga:          $5 USD  → 10 análisis (se suman a los existentes)
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
 * Determina el plan a partir del Product ID de Hotmart.
 *
 * - IDs en HOTMART_PRO_PRODUCT_IDS  → 'pro'
 * - IDs en HOTMART_RECARGA_PRODUCT_IDS → 'recarga'
 * - Cualquier otro                  → 'basico'
 */
export function planFromProduct(
  productId: string | number | null | undefined,
  proIds: string,
  recargaIds?: string,
): Plan {
  const id = productId != null ? String(productId) : '';
  const proList = proIds.split(',').map((s) => s.trim()).filter(Boolean);
  if (id && proList.includes(id)) return 'pro';
  if (recargaIds) {
    const recargaList = recargaIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (id && recargaList.includes(id)) return 'recarga';
  }
  return 'basico';
}

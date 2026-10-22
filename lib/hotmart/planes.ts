/**
 * Planes de ESTE producto (estadistica-tesis-app) — independientes de los
 * de marco-teorico-app. Cada análisis completado cuesta 1 crédito, sin
 * importar su complejidad (modelo más simple que el de tokens de Marco
 * Teórico).
 *
 * ⚠️ PLACEHOLDER: los números de créditos son un valor de arranque
 * razonable, no una decisión de negocio confirmada. Ajusta `creditosLimite`
 * antes de vender el producto de verdad en Hotmart.
 */
export type Plan = 'basico' | 'pro';

export const PLAN_LABELS: Record<Plan, string> = {
  basico: 'Básico',
  pro: 'Pro',
};

export const PLAN_LIMITS: Record<Plan, { creditosLimite: number }> = {
  basico: { creditosLimite: 20 },
  pro: { creditosLimite: 60 },
};

/**
 * IDs de producto de Hotmart que corresponden al plan "pro" (separados por
 * coma en HOTMART_PRO_PRODUCT_IDS). Cualquier otro producto se trata como
 * "basico" — mismo patrón que HOTMART_ADVANCED_PRODUCT_IDS en marco-teorico-app.
 */
export function planFromProduct(productId: string | number | null | undefined, proIds: string): Plan {
  const lista = proIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return productId != null && lista.includes(String(productId)) ? 'pro' : 'basico';
}

import { PLAN_LIMITS, planFromProduct, type Plan } from './planes';

/** Acceso de por vida mientras queden créditos (igual criterio que Marco Teórico). */
export const LIFETIME_ACCESS_DAYS = 5 * 365;

const GRANT_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const REVOKE_EVENTS = new Set(['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']);

export interface HotmartDeps {
  findUserIdByEmail(email: string): Promise<string | null>;
  getUserState(userId: string): Promise<{ creditosLimite: number; hotmartId: string | null } | null>;
  inviteUser(email: string, name: string | null): Promise<{ userId: string; password: string | null } | null>;
  saveUser(record: { userId: string; plan: Plan; creditosLimite: number; hotmartId: string; activeUntilIso: string }): Promise<void>;
  setActiveUntil(userId: string, iso: string | null): Promise<void>;
  onUserCreated?(info: { email: string; name: string | null; password: string | null; plan: Plan; creditos: number }): Promise<void>;
}

export interface HotmartResult {
  status: number;
  body: { ok: boolean; ignored?: string; reason?: string };
}

export interface ProcessOptions {
  proProductIds?: string;
  recargaProductIds?: string;
  now?: Date;
}

function addDaysIso(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function processHotmartEvent(
  payload: any,
  deps: HotmartDeps,
  options: ProcessOptions = {}
): Promise<HotmartResult> {
  const now = options.now ?? new Date();
  const evento: string | undefined = payload?.event;
  if (!evento) {
    return { status: 400, body: { ok: false, reason: 'Falta el campo "event".' } };
  }

  if (GRANT_EVENTS.has(evento)) {
    const email: string | undefined = payload?.data?.buyer?.email;
    const nombre: string | undefined = payload?.data?.buyer?.name;
    const transactionId: string | undefined = payload?.data?.purchase?.transaction;
    const productId = payload?.data?.product?.id;
    const offerCode: string | undefined =
      payload?.data?.purchase?.offer?.code ??
      payload?.data?.purchase?.offer_code;
    if (!email) return { status: 400, body: { ok: false, reason: 'Falta el email del comprador.' } };

    let userId = await deps.findUserIdByEmail(email);
    let isNewUser = false;
    let generatedPassword: string | null = null;
    if (!userId) {
      const result = await deps.inviteUser(email, nombre ?? null);
      if (result) {
        userId = result.userId;
        generatedPassword = result.password;
        isNewUser = true;
      }
    }
    if (!userId) {
      return { status: 500, body: { ok: false, reason: 'No se pudo crear o encontrar el usuario.' } };
    }

    const estado = await deps.getUserState(userId);
    if (transactionId && estado?.hotmartId === transactionId) {
      return { status: 200, body: { ok: true, reason: 'duplicado (mismo transaction id)' } };
    }

    const plan = planFromProduct(productId, options.proProductIds ?? '', options.recargaProductIds ?? '', offerCode);
    const creditosNuevos = (estado?.creditosLimite ?? 0) + PLAN_LIMITS[plan].creditosLimite;
    await deps.saveUser({
      userId,
      plan,
      creditosLimite: creditosNuevos,
      hotmartId: transactionId ?? '',
      activeUntilIso: addDaysIso(now, LIFETIME_ACCESS_DAYS),
    });

    if (isNewUser && deps.onUserCreated) {
      await deps.onUserCreated({ email, name: nombre ?? null, password: generatedPassword, plan, creditos: creditosNuevos });
    }

    return { status: 200, body: { ok: true } };
  }

  if (REVOKE_EVENTS.has(evento)) {
    const email: string | undefined = payload?.data?.buyer?.email;
    if (!email) return { status: 400, body: { ok: false, reason: 'Falta el email del comprador.' } };
    const userId = await deps.findUserIdByEmail(email);
    if (!userId) {
      return { status: 200, body: { ok: true, reason: 'usuario no encontrado (nada que revocar)' } };
    }
    await deps.setActiveUntil(userId, now.toISOString());
    return { status: 200, body: { ok: true } };
  }

  // Evento que no manejamos (p. ej. SUBSCRIPTION_CANCELLATION): 200 para que
  // Hotmart no reintente ni marque el webhook como fallido.
  return { status: 200, body: { ok: true, ignored: evento } };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyHotmartSignature } from '../lib/hotmart/verify';
import { processHotmartEvent, type HotmartDeps } from '../lib/hotmart/process';
import { planFromProduct } from '../lib/hotmart/planes';

test('verifyHotmartSignature: acepta el hottok directo', () => {
  assert.equal(verifyHotmartSignature('{"a":1}', 'mi-secreto', 'mi-secreto'), true);
  assert.equal(verifyHotmartSignature('{"a":1}', 'otro', 'mi-secreto'), false);
});

test('verifyHotmartSignature: acepta HMAC-SHA256 del cuerpo crudo', () => {
  const body = '{"event":"PURCHASE_APPROVED"}';
  const secret = 'mi-secreto';
  const hmac = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyHotmartSignature(body, hmac, secret), true);
  assert.equal(verifyHotmartSignature(body, `sha256=${hmac}`, secret), true);
  assert.equal(verifyHotmartSignature(body, 'firma-incorrecta', secret), false);
});

test('verifyHotmartSignature: rechaza si falta firma o secreto', () => {
  assert.equal(verifyHotmartSignature('{}', null, 'secreto'), false);
  assert.equal(verifyHotmartSignature('{}', 'firma', null), false);
});

test('planFromProduct: solo los IDs listados son "pro"', () => {
  assert.equal(planFromProduct('123', '123,456'), 'pro');
  assert.equal(planFromProduct(456, '123,456'), 'pro');
  assert.equal(planFromProduct('999', '123,456'), 'basico');
  assert.equal(planFromProduct(undefined, '123,456'), 'basico');
});

test('planFromProduct: IDs de recarga se detectan como "recarga"', () => {
  assert.equal(planFromProduct('888', '123', '888,999'), 'recarga');
  assert.equal(planFromProduct('999', '123', '888,999'), 'recarga');
  assert.equal(planFromProduct('123', '123', '888,999'), 'pro');
  assert.equal(planFromProduct('555', '123', '888,999'), 'basico');
});

test('planFromProduct: offer code tiene prioridad sobre product ID', () => {
  assert.equal(planFromProduct('8881343', 'j5of7xB3', 'kzv3vxcy', 'j5of7xB3'), 'pro');
  assert.equal(planFromProduct('8881343', 'j5of7xB3', 'kzv3vxcy', 'kzv3vxcy'), 'recarga');
  assert.equal(planFromProduct('8881343', 'j5of7xB3', 'kzv3vxcy', 'lgmw07ha'), 'basico');
  assert.equal(planFromProduct('8881343', 'j5of7xB3', 'kzv3vxcy', null), 'basico');
});

function fakeDeps(inicial: Record<string, { creditosLimite: number; hotmartId: string | null }> = {}) {
  const usuarios = new Map<string, { creditosLimite: number; hotmartId: string | null; activeUntil: string | null }>();
  for (const [email, v] of Object.entries(inicial)) {
    usuarios.set(email, { ...v, activeUntil: null });
  }
  const invitados: string[] = [];
  const deps: HotmartDeps = {
    async findUserIdByEmail(email) {
      return usuarios.has(email) ? email : null;
    },
    async getUserState(userId) {
      const u = usuarios.get(userId);
      return u ? { creditosLimite: u.creditosLimite, hotmartId: u.hotmartId } : null;
    },
    async inviteUser(email) {
      usuarios.set(email, { creditosLimite: 0, hotmartId: null, activeUntil: null });
      invitados.push(email);
      return email;
    },
    async saveUser({ userId, creditosLimite, hotmartId, activeUntilIso }) {
      const u = usuarios.get(userId)!;
      usuarios.set(userId, { ...u, creditosLimite, hotmartId, activeUntil: activeUntilIso });
    },
    async setActiveUntil(userId, iso) {
      const u = usuarios.get(userId);
      if (u) usuarios.set(userId, { ...u, activeUntil: iso });
    },
  };
  return { deps, usuarios, invitados };
}

test('processHotmartEvent: compra nueva invita y otorga créditos', async () => {
  const { deps, usuarios, invitados } = fakeDeps();
  const r = await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: { buyer: { email: 'nueva@x.com', name: 'Nueva' }, purchase: { transaction: 'TX1' }, product: { id: '999' } },
    },
    deps
  );
  assert.equal(r.status, 200);
  assert.deepEqual(invitados, ['nueva@x.com']);
  assert.equal(usuarios.get('nueva@x.com')?.creditosLimite, 30); // plan básico por defecto
});

test('processHotmartEvent: suma créditos a los que ya tenía (acumulativo)', async () => {
  const { deps, usuarios } = fakeDeps({ 'ya@x.com': { creditosLimite: 10, hotmartId: 'TX0' } });
  await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: { buyer: { email: 'ya@x.com' }, purchase: { transaction: 'TX1' }, product: { id: '999' } },
    },
    deps
  );
  assert.equal(usuarios.get('ya@x.com')?.creditosLimite, 40); // 10 existentes + 30 del plan básico
});

test('processHotmartEvent: dedup por transaction id (APPROVED + COMPLETE)', async () => {
  const { deps, usuarios } = fakeDeps({ 'ya@x.com': { creditosLimite: 10, hotmartId: 'TX1' } });
  const r = await processHotmartEvent(
    {
      event: 'PURCHASE_COMPLETE',
      data: { buyer: { email: 'ya@x.com' }, purchase: { transaction: 'TX1' }, product: { id: '999' } },
    },
    deps
  );
  assert.equal(r.status, 200);
  assert.equal(usuarios.get('ya@x.com')?.creditosLimite, 10); // no se duplicó
});

test('processHotmartEvent: plan "pro" otorga más créditos', async () => {
  const { deps, usuarios } = fakeDeps();
  await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: { buyer: { email: 'pro@x.com' }, purchase: { transaction: 'TX9' }, product: { id: '777' } },
    },
    deps,
    { proProductIds: '777' }
  );
  assert.equal(usuarios.get('pro@x.com')?.creditosLimite, 80);
});

test('processHotmartEvent: recarga suma 10 créditos al saldo existente', async () => {
  const { deps, usuarios } = fakeDeps({ 'rec@x.com': { creditosLimite: 25, hotmartId: 'TX0' } });
  await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: { buyer: { email: 'rec@x.com' }, purchase: { transaction: 'TX-REC' }, product: { id: '888' } },
    },
    deps,
    { recargaProductIds: '888' }
  );
  assert.equal(usuarios.get('rec@x.com')?.creditosLimite, 35); // 25 + 10
});

test('processHotmartEvent: reembolso revoca el acceso', async () => {
  const { deps, usuarios } = fakeDeps({ 'ya@x.com': { creditosLimite: 20, hotmartId: 'TX1' } });
  const ahora = new Date('2026-06-01T00:00:00Z');
  const r = await processHotmartEvent(
    { event: 'PURCHASE_REFUNDED', data: { buyer: { email: 'ya@x.com' } } },
    deps,
    { now: ahora }
  );
  assert.equal(r.status, 200);
  assert.equal(usuarios.get('ya@x.com')?.activeUntil, ahora.toISOString());
});

test('processHotmartEvent: evento desconocido se ignora con 200', async () => {
  const { deps } = fakeDeps();
  const r = await processHotmartEvent({ event: 'SUBSCRIPTION_CANCELLATION', data: {} }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.ignored, 'SUBSCRIPTION_CANCELLATION');
});

test('processHotmartEvent: offer code distingue plan dentro del mismo producto', async () => {
  const { deps, usuarios } = fakeDeps({ 'user@x.com': { creditosLimite: 5, hotmartId: 'TX0' } });
  // Compra con offer code de "pro" (j5of7xB3) — mismo product ID para todos
  await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: {
        buyer: { email: 'user@x.com' },
        purchase: { transaction: 'TX-PRO', offer: { code: 'j5of7xB3' } },
        product: { id: '8881343' },
      },
    },
    deps,
    { proProductIds: 'j5of7xB3', recargaProductIds: 'kzv3vxcy' }
  );
  assert.equal(usuarios.get('user@x.com')?.creditosLimite, 85); // 5 + 80 (pro)

  // Compra con offer code de "recarga" (kzv3vxcy)
  const { deps: deps2, usuarios: u2 } = fakeDeps({ 'r@x.com': { creditosLimite: 20, hotmartId: 'TX0' } });
  await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: {
        buyer: { email: 'r@x.com' },
        purchase: { transaction: 'TX-REC2', offer: { code: 'kzv3vxcy' } },
        product: { id: '8881343' },
      },
    },
    deps2,
    { proProductIds: 'j5of7xB3', recargaProductIds: 'kzv3vxcy' }
  );
  assert.equal(u2.get('r@x.com')?.creditosLimite, 30); // 20 + 10 (recarga)

  // Compra con offer code base (lgmw07ha) → default 'basico'
  const { deps: deps3, usuarios: u3 } = fakeDeps();
  await processHotmartEvent(
    {
      event: 'PURCHASE_APPROVED',
      data: {
        buyer: { email: 'new@x.com' },
        purchase: { transaction: 'TX-BAS', offer: { code: 'lgmw07ha' } },
        product: { id: '8881343' },
      },
    },
    deps3,
    { proProductIds: 'j5of7xB3', recargaProductIds: 'kzv3vxcy' }
  );
  assert.equal(u3.get('new@x.com')?.creditosLimite, 30); // 30 (basico)
});

test('processHotmartEvent: falta el email del comprador -> 400', async () => {
  const { deps } = fakeDeps();
  const r = await processHotmartEvent({ event: 'PURCHASE_APPROVED', data: { buyer: {} } }, deps);
  assert.equal(r.status, 400);
});

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyHotmartSignature } from '@/lib/hotmart/verify';
import { processHotmartEvent, type HotmartDeps } from '@/lib/hotmart/process';
import { sendCredentialsEmail } from '@/lib/email/send-credentials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Hotmart hace un ping de conectividad (GET) al registrar o probar el webhook.
export async function GET() {
  return NextResponse.json({ ok: true });
}

function buildDeps(): HotmartDeps {
  const admin = createAdminClient();
  return {
    async findUserIdByEmail(email) {
      const { data } = await admin.from('users').select('id').eq('email', email).maybeSingle();
      return data?.id ?? null;
    },
    async getUserState(userId) {
      const { data } = await admin
        .from('users')
        .select('creditos_limite, hotmart_id')
        .eq('id', userId)
        .maybeSingle();
      if (!data) return null;
      return { creditosLimite: data.creditos_limite, hotmartId: data.hotmart_id };
    },
    async inviteUser(email, name) {
      const password = randomBytes(4).toString('hex');
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { name } : undefined,
      });
      if (error || !data.user) {
        console.error('[hotmart-webhook] createUser error:', error?.message);
        return null;
      }
      await admin.from('users').update({ email }).eq('id', data.user.id);
      return { userId: data.user.id, password };
    },
    async saveUser({ userId, plan, creditosLimite, hotmartId, activeUntilIso }) {
      const { error } = await admin
        .from('users')
        .update({ plan, creditos_limite: creditosLimite, hotmart_id: hotmartId, active_until: activeUntilIso })
        .eq('id', userId);
      if (error) {
        console.error('[hotmart-webhook] saveUser error:', JSON.stringify(error));
        throw new Error(`saveUser failed: ${error.message}`);
      }
    },
    async setActiveUntil(userId, iso) {
      await admin.from('users').update({ active_until: iso }).eq('id', userId);
    },
    async onUserCreated({ email, name, password, plan, creditos }) {
      const raw = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
      const appUrl = raw.startsWith('https://') ? raw : 'https://estadistica-tesis-app-p3bx.vercel.app';
      console.log('[hotmart-webhook] sending email to', email, { isNew: !!password, plan, creditos });
      await sendCredentialsEmail({ to: email, name, password, plan, creditos, appUrl });
    },
  };
}

export async function POST(request: Request) {
  const secret = process.env.HOTMART_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'HOTMART_WEBHOOK_SECRET no configurado.' }, { status: 500 });
  }

  const rawBody = await request.text();
  const firma =
    request.headers.get('x-hotmart-hottok') ??
    request.headers.get('x-hotmart-signature') ??
    request.headers.get('x-signature');

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const hottokEnCuerpo = (payload as { hottok?: string })?.hottok;
  if (!verifyHotmartSignature(rawBody, firma ?? hottokEnCuerpo, secret)) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  const options = {
    proProductIds: process.env.HOTMART_PRO_PRODUCT_IDS ?? '',
    recargaProductIds: process.env.HOTMART_RECARGA_PRODUCT_IDS ?? '',
  };

  console.log('[hotmart-webhook]', JSON.stringify({
    event: (payload as any)?.event,
    email: (payload as any)?.data?.buyer?.email,
    productId: (payload as any)?.data?.product?.id,
    offerCode: (payload as any)?.data?.purchase?.offer?.code ?? (payload as any)?.data?.purchase?.offer_code,
    transaction: (payload as any)?.data?.purchase?.transaction,
    proIds: options.proProductIds,
    recargaIds: options.recargaProductIds,
  }));

  const resultado = await processHotmartEvent(payload, buildDeps(), options);

  console.log('[hotmart-webhook] resultado:', JSON.stringify(resultado));

  return NextResponse.json(resultado.body, { status: resultado.status });
}

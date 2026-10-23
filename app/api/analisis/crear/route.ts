import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/session';
import { definicionDe } from '@/lib/engine/decisionTree';
import type { TipoAnalisis } from '@/types/analisis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({ tipoAnalisis: z.string() });

/**
 * Crea un `analisis` SIN archivo — solo para los tipos que no necesitan
 * datos (`requiereArchivo === false`: muestra_poblacion, potencia_muestra).
 * Para los demás tipos, el flujo normal empieza en /api/analisis/subir.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }
  const tipoAnalisis = body.data.tipoAnalisis as TipoAnalisis;
  let definicion;
  try {
    definicion = definicionDe(tipoAnalisis);
  } catch {
    return NextResponse.json({ error: `Tipo de análisis desconocido: ${tipoAnalisis}` }, { status: 400 });
  }
  if (definicion.requiereArchivo) {
    return NextResponse.json(
      { error: `"${definicion.etiqueta}" necesita datos — sube un archivo desde /subir.` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: analisis, error } = await admin
    .from('analisis')
    .insert({ user_id: user.id, tipo_analisis: tipoAnalisis, estado: 'pendiente' })
    .select('id')
    .single();

  if (error || !analisis) {
    return NextResponse.json(
      { error: `No se pudo crear el análisis: ${error?.message ?? 'desconocido'}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ id: analisis.id });
}

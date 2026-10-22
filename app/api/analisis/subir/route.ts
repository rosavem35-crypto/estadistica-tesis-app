import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/session';
import { validarArchivoDatos } from '@/lib/validate';
import { subirArchivoOriginal } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const form = await request.formData();
  const file = form.get('archivo');
  const privacidadConfirmada = form.get('privacidadConfirmada') === 'true';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo ("archivo").' }, { status: 400 });
  }
  if (!privacidadConfirmada) {
    return NextResponse.json(
      { error: 'Debes confirmar que el archivo no contiene datos que identifiquen a personas.' },
      { status: 400 }
    );
  }

  const validacion = validarArchivoDatos(file.name, file.size);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: analisis, error: insertError } = await admin
    .from('analisis')
    .insert({
      user_id: user.id,
      tipo_analisis: 'perfil_datos',
      nombre_archivo_original: file.name,
      estado: 'pendiente',
    })
    .select('id')
    .single();

  if (insertError || !analisis) {
    return NextResponse.json(
      { error: `No se pudo crear el análisis: ${insertError?.message ?? 'desconocido'}` },
      { status: 500 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = await subirArchivoOriginal(admin, user.id, analisis.id, file.name, buffer);
    await admin.from('analisis').update({ archivo_original_path: path }).eq('id', analisis.id);
  } catch (err) {
    await admin
      .from('analisis')
      .update({ estado: 'error', error_detalle: err instanceof Error ? err.message : String(err) })
      .eq('id', analisis.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo subir el archivo.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: analisis.id });
}

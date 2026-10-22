import { NextResponse } from 'next/server';
import { toFile } from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/supabase/session';
import { getAnthropicClient } from '@/lib/anthropic/client';
import { runAnalysis } from '@/lib/engine/runAnalysis';
import { downloadOutputFiles } from '@/lib/engine/downloadOutputs';
import { descargarArchivoOriginal } from '@/lib/storage';
import type { PerfilColumna } from '@/types/analisis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const admin = createAdminClient();
  const { data: analisis, error } = await admin
    .from('analisis')
    .select('id, nombre_archivo_original, archivo_original_path, container_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !analisis) {
    return NextResponse.json({ error: 'Análisis no encontrado.' }, { status: 404 });
  }
  if (!analisis.archivo_original_path) {
    return NextResponse.json({ error: 'El análisis no tiene un archivo asociado.' }, { status: 400 });
  }

  try {
    const buffer = await descargarArchivoOriginal(admin, analisis.archivo_original_path);
    const client = getAnthropicClient();
    const uploaded = await client.files.upload({
      file: await toFile(buffer, analisis.nombre_archivo_original ?? 'datos.xlsx'),
    });

    const resultado = await runAnalysis({
      fileId: uploaded.id,
      tipoAnalisis: 'perfil_datos',
      parametros: {},
      nombreArchivoOriginal: analisis.nombre_archivo_original ?? 'datos',
    });

    const descargados = await downloadOutputFiles(resultado.outputFiles.map((f) => f.fileId));
    const perfilFile = descargados.find((f) => f.filename.endsWith('perfil.json'));
    if (!perfilFile) {
      await admin
        .from('analisis')
        .update({ estado: 'error', error_detalle: 'El motor no generó perfil.json. Respuesta: ' + resultado.narrative.slice(0, 2000) })
        .eq('id', analisis.id);
      return NextResponse.json(
        { error: 'No se pudo perfilar el archivo. Intenta de nuevo o revisa el formato del archivo.' },
        { status: 502 }
      );
    }

    const columnas: PerfilColumna[] = JSON.parse(perfilFile.buffer.toString('utf-8'));

    await admin
      .from('analisis')
      .update({ perfil_columnas: columnas, container_id: resultado.containerId })
      .eq('id', analisis.id);

    return NextResponse.json({ columnas });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    await admin.from('analisis').update({ estado: 'error', error_detalle: mensaje }).eq('id', analisis.id);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

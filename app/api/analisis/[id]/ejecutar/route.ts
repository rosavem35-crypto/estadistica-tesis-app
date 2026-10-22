import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toFile } from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAnthropicClient } from '@/lib/anthropic/client';
import { runAnalysis } from '@/lib/engine/runAnalysis';
import { downloadOutputFiles } from '@/lib/engine/downloadOutputs';
import { descargarArchivoOriginal, subirReporte, borrarArchivoOriginal } from '@/lib/storage';
import { definicionDe } from '@/lib/engine/decisionTree';
import type { TipoAnalisis } from '@/types/analisis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BodySchema = z.object({
  tipoAnalisis: z.string(),
  parametros: z.record(z.unknown()),
});

function validarParametros(tipoAnalisis: TipoAnalisis, parametros: Record<string, unknown>): string | null {
  const definicion = definicionDe(tipoAnalisis);
  for (const campo of definicion.campos) {
    if (!campo.requerido) continue;
    const valor = parametros[campo.nombre];
    const vacio =
      valor === undefined ||
      valor === null ||
      valor === '' ||
      (Array.isArray(valor) && valor.length === 0);
    if (vacio) return `Falta el campo requerido "${campo.etiqueta}".`;
  }
  return null;
}

function categorizarArchivo(nombre: string): 'md' | 'docx' | 'xlsx' | 'png' | 'otro' {
  if (nombre.endsWith('.md')) return 'md';
  if (nombre.endsWith('.docx')) return 'docx';
  if (nombre.endsWith('.xlsx')) return 'xlsx';
  if (nombre.endsWith('.png')) return 'png';
  return 'otro';
}

// TODO Fase 3: reemplazar DEV_USER_ID por requireUser(), descontar 1
// crédito al terminar con éxito (nunca antes de saber que el análisis
// funcionó), y rechazar si no quedan créditos.
export async function POST(request: Request, { params }: { params: { id: string } }) {
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
  const errorParametros = validarParametros(tipoAnalisis, body.data.parametros);
  if (errorParametros) {
    return NextResponse.json({ error: errorParametros }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: analisis, error } = await admin
    .from('analisis')
    .select('id, user_id, nombre_archivo_original, archivo_original_path, container_id')
    .eq('id', params.id)
    .single();

  if (error || !analisis) {
    return NextResponse.json({ error: 'Análisis no encontrado.' }, { status: 404 });
  }
  if (!analisis.archivo_original_path) {
    return NextResponse.json({ error: 'El análisis no tiene un archivo asociado.' }, { status: 400 });
  }

  await admin
    .from('analisis')
    .update({ tipo_analisis: tipoAnalisis, parametros: body.data.parametros, estado: 'procesando' })
    .eq('id', analisis.id);

  try {
    const buffer = await descargarArchivoOriginal(admin, analisis.archivo_original_path);
    const client = getAnthropicClient();
    const uploaded = await client.files.upload({
      file: await toFile(buffer, analisis.nombre_archivo_original ?? 'datos.xlsx'),
    });

    const resultado = await runAnalysis({
      fileId: uploaded.id,
      tipoAnalisis,
      parametros: body.data.parametros,
      nombreArchivoOriginal: analisis.nombre_archivo_original ?? 'datos',
      containerId: analisis.container_id ?? undefined,
    });

    if (resultado.outputFiles.length === 0) {
      throw new Error(`El motor no generó archivos de salida. Respuesta: ${resultado.narrative.slice(0, 2000)}`);
    }

    const descargados = await downloadOutputFiles(resultado.outputFiles.map((f) => f.fileId));

    const actualizacion: Record<string, unknown> = {
      estado: 'completado',
      resultado_resumen: resultado.narrative.slice(0, 4000),
      container_id: resultado.containerId,
      figuras_paths: [] as string[],
    };

    for (const archivo of descargados) {
      const categoria = categorizarArchivo(archivo.filename);
      const path = await subirReporte(admin, analisis.user_id, analisis.id, archivo.filename, archivo.buffer);
      if (categoria === 'md') actualizacion.reporte_md_path = path;
      else if (categoria === 'docx') actualizacion.reporte_docx_path = path;
      else if (categoria === 'xlsx') actualizacion.reporte_xlsx_path = path;
      else if (categoria === 'png') (actualizacion.figuras_paths as string[]).push(path);
    }

    await admin.from('analisis').update(actualizacion).eq('id', analisis.id);
    await borrarArchivoOriginal(admin, analisis.archivo_original_path);

    return NextResponse.json({ id: analisis.id, definicion: definicion.etiqueta });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    await admin.from('analisis').update({ estado: 'error', error_detalle: mensaje }).eq('id', analisis.id);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

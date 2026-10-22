import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { urlFirmadaReporte } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TODO Fase 3: reemplazar DEV_USER_ID por requireUser() y scope real.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: analisis, error } = await admin
    .from('analisis')
    .select(
      'id, tipo_analisis, estado, error_detalle, resultado_resumen, reporte_md_path, reporte_docx_path, reporte_xlsx_path, figuras_paths, perfil_columnas'
    )
    .eq('id', params.id)
    .single();

  if (error || !analisis) {
    return NextResponse.json({ error: 'Análisis no encontrado.' }, { status: 404 });
  }

  if (analisis.estado !== 'completado') {
    return NextResponse.json(analisis);
  }

  const [mdUrl, docxUrl, xlsxUrl, figurasUrls] = await Promise.all([
    analisis.reporte_md_path ? urlFirmadaReporte(admin, analisis.reporte_md_path) : null,
    analisis.reporte_docx_path ? urlFirmadaReporte(admin, analisis.reporte_docx_path) : null,
    analisis.reporte_xlsx_path ? urlFirmadaReporte(admin, analisis.reporte_xlsx_path) : null,
    Promise.all((analisis.figuras_paths ?? []).map((p: string) => urlFirmadaReporte(admin, p))),
  ]);

  return NextResponse.json({
    ...analisis,
    reporteMdUrl: mdUrl,
    reporteDocxUrl: docxUrl,
    reporteXlsxUrl: xlsxUrl,
    figurasUrls,
  });
}

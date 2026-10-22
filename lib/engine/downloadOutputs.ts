import { getAnthropicClient } from '@/lib/anthropic/client';

export interface ArchivoDescargado {
  fileId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * Descarga un archivo de salida generado por el tool de ejecución de código
 * (docx/xlsx/md/png). Solo funciona con archivos marcados `downloadable`
 * (los que crea el skill en $OUTPUT_DIR) — los archivos que el usuario sube
 * NO se pueden descargar de vuelta por esta vía.
 */
export async function downloadOutputFile(fileId: string): Promise<ArchivoDescargado> {
  const client = getAnthropicClient();
  const [metadata, response] = await Promise.all([
    client.files.retrieveMetadata(fileId),
    client.files.download(fileId),
  ]);
  const arrayBuffer = await response.arrayBuffer();
  return {
    fileId,
    filename: metadata.filename,
    mimeType: metadata.mime_type,
    buffer: Buffer.from(arrayBuffer),
  };
}

export async function downloadOutputFiles(fileIds: string[]): Promise<ArchivoDescargado[]> {
  return Promise.all(fileIds.map(downloadOutputFile));
}

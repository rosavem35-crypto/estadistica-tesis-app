import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET_DATOS_SUBIDOS = 'datos-subidos';
export const BUCKET_REPORTES = 'reportes-generados';

export async function subirArchivoOriginal(
  admin: SupabaseClient,
  userId: string,
  analisisId: string,
  nombreArchivo: string,
  buffer: Buffer
): Promise<string> {
  const path = `${userId}/${analisisId}/${nombreArchivo}`;
  const { error } = await admin.storage.from(BUCKET_DATOS_SUBIDOS).upload(path, buffer, {
    upsert: true,
  });
  if (error) throw new Error(`No se pudo guardar el archivo: ${error.message}`);
  return path;
}

export async function descargarArchivoOriginal(
  admin: SupabaseClient,
  path: string
): Promise<Buffer> {
  const { data, error } = await admin.storage.from(BUCKET_DATOS_SUBIDOS).download(path);
  if (error || !data) throw new Error(`No se pudo leer el archivo original: ${error?.message ?? 'desconocido'}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function borrarArchivoOriginal(admin: SupabaseClient, path: string): Promise<void> {
  await admin.storage.from(BUCKET_DATOS_SUBIDOS).remove([path]);
}

export async function subirReporte(
  admin: SupabaseClient,
  userId: string,
  analisisId: string,
  nombreArchivo: string,
  buffer: Buffer
): Promise<string> {
  const path = `${userId}/${analisisId}/${nombreArchivo}`;
  const { error } = await admin.storage.from(BUCKET_REPORTES).upload(path, buffer, { upsert: true });
  if (error) throw new Error(`No se pudo guardar "${nombreArchivo}": ${error.message}`);
  return path;
}

export async function urlFirmadaReporte(
  admin: SupabaseClient,
  path: string,
  segundos = 600
): Promise<string> {
  const { data, error } = await admin.storage.from(BUCKET_REPORTES).createSignedUrl(path, segundos);
  if (error || !data) throw new Error(`No se pudo firmar la URL de "${path}": ${error?.message ?? 'desconocido'}`);
  return data.signedUrl;
}

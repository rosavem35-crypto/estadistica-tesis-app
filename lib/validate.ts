const EXTENSIONES_PERMITIDAS = ['.xlsx', '.csv'];
const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB

export interface ValidacionArchivo {
  ok: boolean;
  error?: string;
}

/**
 * Valida el archivo de datos antes de subirlo. Solo .xlsx/.csv: el motor
 * corre en el contenedor de ejecución de código de Anthropic, que no tiene
 * `pyreadstat` instalado, así que .sav no funciona ahí (ver
 * skill/estadistica-tesis-latam/references/alcance_y_limites.md).
 */
export function validarArchivoDatos(nombre: string, tamanoBytes: number): ValidacionArchivo {
  const ext = nombre.slice(nombre.lastIndexOf('.')).toLowerCase();
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
    if (ext === '.sav') {
      return {
        ok: false,
        error:
          'Los archivos .sav de SPSS no son compatibles. En SPSS, usa Archivo > ' +
          'Guardar como > Excel, y sube ese archivo .xlsx.',
      };
    }
    return {
      ok: false,
      error: `Formato "${ext || 'desconocido'}" no soportado. Sube un archivo .xlsx o .csv.`,
    };
  }
  if (tamanoBytes <= 0) {
    return { ok: false, error: 'El archivo está vacío.' };
  }
  if (tamanoBytes > TAMANO_MAXIMO_BYTES) {
    return { ok: false, error: `El archivo supera el máximo de ${TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB.` };
  }
  return { ok: true };
}

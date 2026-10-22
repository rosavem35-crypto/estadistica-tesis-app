import type { TipoAnalisis } from '@/types/analisis';

/**
 * Nombre de la función Python del skill `estadistica-tesis-latam` para cada
 * tipo de análisis que expone esta app. Debe mantenerse en sincronía con
 * `skill/estadistica-tesis-latam/references/arbol_decision.md`.
 */
export const FUNCION_POR_TIPO: Record<TipoAnalisis, string> = {
  perfil_datos: 'perfil_datos',
  descriptivos: 'descriptivos',
  frecuencias: 'frecuencias',
  comparar_grupos: 'comparar_grupos',
  comparar_pareadas: 'comparar_pareadas',
  correlacion: 'correlacion',
  matriz_correlaciones: 'matriz_correlaciones',
  chi_cuadrado: 'chi_cuadrado',
  regresion_lineal: 'regresion_lineal',
  regresion_logistica: 'regresion_logistica',
  muestra_poblacion: 'muestra_poblacion',
  potencia_muestra: 'potencia_muestra',
  confiabilidad: 'confiabilidad_escala',
};

/**
 * Construye el prompt que le dice a Claude exactamente qué función del skill
 * ejecutar y con qué parámetros. El archivo de datos del usuario ya viene
 * adjunto al mensaje como bloque `container_upload`; Claude debe localizarlo
 * dentro del contenedor (no asumimos una ruta fija, porque no es parte
 * documentada de la API) antes de cargarlo con `cargar_datos()`.
 *
 * No se le pide a Claude que "redacte" nada por su cuenta: toda la redacción
 * y las reglas de honestidad ya viven en el skill (`SKILL.md`), que es la
 * única fuente de verdad para el texto que ve el investigador.
 */
export function buildAnalysisPrompt(
  tipoAnalisis: TipoAnalisis,
  parametros: Record<string, unknown>,
  opts: { nombreArchivoOriginal: string; salida?: string } = { nombreArchivoOriginal: 'datos' }
): string {
  const funcion = FUNCION_POR_TIPO[tipoAnalisis];
  const salida = opts.salida ?? 'resultados';

  const pasoPerfilJson =
    tipoAnalisis === 'perfil_datos'
      ? `\n4b. Además, escribe un archivo "perfil.json" en $OUTPUT_DIR con un array de objetos con ` +
        `EXACTAMENTE estas claves (en este orden de mayúsculas/minúsculas): ` +
        `\`{"nombre": string, "tipoDetectado": string, "nValido": number, "pctFaltante": number}\`, uno ` +
        `por cada columna que \`perfil_datos\` describió en su tabla (usa los mismos valores que aparecen ` +
        `en la tabla/los \`datos\` del Resultado — no inventes ni redondees por tu cuenta). Esto es ` +
        `además de los informes normales (.md/.xlsx/.docx), no en lugar de ellos.`
      : '';

  return `Usa el skill "estadistica-tesis-latam" para este análisis. Sigue exactamente su SKILL.md (flujo, reglas de honestidad, formato APA 7 en español).

1. Hay un archivo de datos adjunto a este contenedor (subido como attachment del mensaje, nombre original aproximado "${opts.nombreArchivoOriginal}"). Localízalo explorando el contenedor (por ejemplo, revisa el directorio de archivos de entrada/adjuntos con el bash tool) — no asumas una ruta fija.
2. Cárgalo con \`cargar_datos()\` del skill (acepta .xlsx/.csv). Si no encuentras el archivo o no puedes leerlo, DETENTE y reporta el error exacto en texto plano — no inventes datos ni resultados.
3. Ejecuta exactamente la función \`${funcion}\` de \`tesis_stats.py\` con estos parámetros (en formato de los argumentos de esa función en Python, tal como se documentan en el skill):
\`\`\`json
${JSON.stringify(parametros, null, 2)}
\`\`\`
   Usa \`salida="${salida}"\` para que las figuras y el informe se guarden ahí.
4. Arma un \`Informe\` con ese único resultado y guárdalo con \`.guardar(formatos=["md","xlsx","docx"])\`.${pasoPerfilJson}
5. Copia TODOS los archivos generados (el .md, el .xlsx, el .docx, y cada figura .png) a la carpeta de salida del contenedor ($OUTPUT_DIR) para que puedan descargarse. No omitas ninguno.
6. Responde en texto plano (fuera de la ejecución de código) con: (a) un resumen de 2-3 líneas en español de lo que encontraste, en lenguaje sencillo, (b) la lista de nombres de archivo que copiaste a $OUTPUT_DIR, (c) cualquier advertencia (\`avisos\`) que haya generado el skill. Si algo falló, dilo explícitamente en vez de simular un resultado.`;
}

#!/usr/bin/env -S npx tsx
/**
 * Prueba E2E real contra la API de Anthropic (Fase 1d del plan). Sube el
 * archivo de ejemplo del skill, corre "confiabilidad" y luego
 * "comparar_grupos" reutilizando el mismo contenedor, descarga las salidas
 * y las deja en el scratchpad para inspección manual.
 *
 * Requiere ANTHROPIC_API_KEY_ESTADISTICA y ANTHROPIC_SKILL_ID en el entorno
 * (este último lo imprime scripts/setup/upload-skill.ts).
 *
 * Uso: npx tsx scripts/setup/test-e2e-analysis.ts
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAnthropicClient } from '@/lib/anthropic/client';
import { runAnalysis } from '@/lib/engine/runAnalysis';
import { downloadOutputFiles } from '@/lib/engine/downloadOutputs';

const EJEMPLO_XLSX = join(process.cwd(), 'skill', 'estadistica-tesis-latam', 'ejemplos', 'datos_ejemplo.xlsx');
const OUT_DIR = process.env.E2E_OUT_DIR || join(process.cwd(), '.e2e-output');

async function main() {
  if (!existsSync(EJEMPLO_XLSX)) {
    throw new Error(`No existe ${EJEMPLO_XLSX}. ¿Corriste la Fase 1b del plan?`);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const client = getAnthropicClient();

  console.log('Subiendo datos_ejemplo.xlsx...');
  const uploaded = await client.files.upload({ file: createReadStream(EJEMPLO_XLSX) });
  console.log(`  file_id = ${uploaded.id}`);

  console.log('\n[1/2] Corriendo confiabilidad_escala...');
  const r1 = await runAnalysis({
    fileId: uploaded.id,
    tipoAnalisis: 'confiabilidad',
    parametros: {
      items: ['satisf_1', 'satisf_2', 'satisf_3', 'satisf_4', 'satisf_5'],
      etiqueta_escala: 'Satisfacción',
    },
    nombreArchivoOriginal: 'datos_ejemplo.xlsx',
  });
  console.log('  narrative:', r1.narrative.slice(0, 500));
  console.log('  outputFiles:', r1.outputFiles);
  console.log('  containerId:', r1.containerId);

  console.log('\n[2/2] Corriendo comparar_grupos (reusando el contenedor)...');
  const r2 = await runAnalysis({
    fileId: uploaded.id,
    tipoAnalisis: 'comparar_grupos',
    parametros: { y: 'postest', grupo: 'grupo' },
    nombreArchivoOriginal: 'datos_ejemplo.xlsx',
    containerId: r1.containerId ?? undefined,
  });
  console.log('  narrative:', r2.narrative.slice(0, 500));
  console.log('  outputFiles:', r2.outputFiles);

  const allOutputs = [...r1.outputFiles, ...r2.outputFiles];
  if (allOutputs.length === 0) {
    throw new Error('Ninguna de las dos llamadas produjo archivos de salida — revisar narrative arriba.');
  }

  console.log(`\nDescargando ${allOutputs.length} archivos a ${OUT_DIR}...`);
  const downloaded = await downloadOutputFiles(allOutputs.map((o) => o.fileId));
  for (const file of downloaded) {
    const dest = join(OUT_DIR, `${file.fileId}_${file.filename}`);
    writeFileSync(dest, file.buffer);
    console.log(`  [${file.mimeType}] ${file.buffer.length} bytes -> ${dest}`);
  }

  console.log('\nOK: revisa los archivos descargados manualmente.');
}

main().catch((err) => {
  console.error('ERROR:', err instanceof Error ? err.message : err);
  process.exit(1);
});

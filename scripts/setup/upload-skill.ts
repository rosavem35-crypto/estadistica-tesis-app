#!/usr/bin/env -S npx tsx
/**
 * Sube (o actualiza) el skill `estadistica-tesis-latam` a la Skills API de
 * Anthropic. Se corre a mano, una vez, y de nuevo cada vez que cambie el
 * contenido de skill/estadistica-tesis-latam/ (p. ej. al agregar un nuevo
 * tipo de análisis).
 *
 * Uso:
 *   npx tsx scripts/setup/upload-skill.ts              # crea un skill nuevo
 *   npx tsx scripts/setup/upload-skill.ts --update      # nueva versión del
 *                                                          skill en ANTHROPIC_SKILL_ID
 *
 * Imprime el skill_id (o confirma la nueva versión) para guardarlo en
 * .env.local como ANTHROPIC_SKILL_ID.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { toFile } from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic/client';

const SKILL_DIR = join(process.cwd(), 'skill', 'estadistica-tesis-latam');
const SKILL_NAME = 'estadistica-tesis-latam';

const EXCLUDE_DIRS = new Set(['__pycache__', '.pytest_cache', '.git']);

function listFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry) || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full, base));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const update = process.argv.includes('--update');
  const files = listFiles(SKILL_DIR, SKILL_DIR);
  if (files.length === 0) {
    throw new Error(`No se encontraron archivos en ${SKILL_DIR}. ¿Corriste la Fase 1b del plan?`);
  }

  const uploads = await Promise.all(
    files.map(async (path) => {
      const relPath = `${SKILL_NAME}/${relative(SKILL_DIR, path).split('\\').join('/')}`;
      const bytes = readFileSync(path);
      return toFile(bytes, relPath);
    })
  );

  console.log(`Subiendo ${uploads.length} archivos de ${SKILL_DIR}...`);

  const client = getAnthropicClient();

  if (update) {
    const skillId = process.env.ANTHROPIC_SKILL_ID;
    if (!skillId) throw new Error('--update requiere ANTHROPIC_SKILL_ID en el entorno.');
    const version = await client.skills.versions.create(skillId, { files: uploads });
    console.log(`Nueva versión creada: skill_id=${skillId} version_id=${version.id}`);
    return;
  }

  const skill = await client.skills.create({
    files: uploads,
    display_name: 'Estadística para tesis (LatAm)',
  });
  console.log('Skill creado.');
  console.log(`  skill_id = ${skill.id}`);
  console.log(`  latest_version_id = ${skill.latest_version_id}`);
  console.log('\nAgrega esto a .env.local (y al entorno de despliegue):');
  console.log(`ANTHROPIC_SKILL_ID=${skill.id}`);
}

main().catch((err) => {
  console.error('ERROR:', err instanceof Error ? err.message : err);
  process.exit(1);
});

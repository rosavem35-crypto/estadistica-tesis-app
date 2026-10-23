import { getAnthropicClient } from '@/lib/anthropic/client';
import { buildAnalysisPrompt } from '@/lib/engine/prompts';
import type { TipoAnalisis } from '@/types/analisis';

/** Modelo con soporte del tool de ejecución de código + Skills API. */
const MODEL = 'claude-sonnet-5-5';

/** Versión del tool de ejecución de código (ver investigación en el plan). */
const CODE_EXECUTION_TOOL = { type: 'code_execution_20260521' as const, name: 'code_execution' as const };

export interface RunAnalysisInput {
  /**
   * file_id (Files API) del archivo de datos ya subido por el usuario.
   * Omitir para los tipos que no necesitan datos (muestra_poblacion,
   * potencia_muestra) — ver `requiereArchivo` en decisionTree.ts.
   */
  fileId?: string;
  tipoAnalisis: TipoAnalisis;
  parametros: Record<string, unknown>;
  nombreArchivoOriginal: string;
  /** Si se pasa, reutiliza un contenedor previo (mismo skill ya montado). */
  containerId?: string;
  salida?: string;
}

export interface ArchivoDeSalida {
  fileId: string;
  /** De qué bloque de la respuesta vino ('bash' es el caso normal). */
  origen: 'bash' | 'code';
}

export interface RunAnalysisResult {
  containerId: string | null;
  outputFiles: ArchivoDeSalida[];
  /** Texto narrativo que Claude devolvió fuera de la ejecución de código. */
  narrative: string;
  stopReason: string | null;
  raw: unknown;
}

/**
 * Llama a la Messages API con el skill `estadistica-tesis-latam` montado en
 * el contenedor y el tool de ejecución de código habilitado, pidiéndole a
 * Claude que corra exactamente una función del skill sobre el archivo de
 * datos adjunto. No parsea ni reescribe los números/texto que produce el
 * skill — esta función solo orquesta la llamada y recolecta los file_id de
 * salida; la fuente de verdad del contenido es siempre el skill.
 */
export async function runAnalysis(input: RunAnalysisInput): Promise<RunAnalysisResult> {
  const client = getAnthropicClient();
  const skillId = process.env.ANTHROPIC_SKILL_ID;
  if (!input.containerId && !skillId) {
    throw new Error(
      'Falta ANTHROPIC_SKILL_ID en el entorno (corre scripts/setup/upload-skill.ts primero).'
    );
  }

  const conArchivo = !!input.fileId;
  const prompt = buildAnalysisPrompt(input.tipoAnalisis, input.parametros, {
    nombreArchivoOriginal: input.nombreArchivoOriginal,
    salida: input.salida,
    conArchivo,
  });

  const content: Array<{ type: 'container_upload'; file_id: string } | { type: 'text'; text: string }> = [];
  if (input.fileId) content.push({ type: 'container_upload', file_id: input.fileId });
  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    container: input.containerId
      ? { id: input.containerId }
      : { skills: [{ type: 'custom', skill_id: skillId!, version: 'latest' }] },
    tools: [CODE_EXECUTION_TOOL],
    messages: [{ role: 'user', content }],
  });

  const outputFiles: ArchivoDeSalida[] = [];
  const narrativeParts: string[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      narrativeParts.push(block.text);
      continue;
    }
    if (block.type === 'bash_code_execution_tool_result') {
      const content = block.content;
      if ('content' in content) {
        for (const out of content.content) {
          outputFiles.push({ fileId: out.file_id, origen: 'bash' });
        }
      }
      continue;
    }
    if (block.type === 'code_execution_tool_result') {
      const content = block.content;
      if ('content' in content) {
        for (const out of content.content) {
          outputFiles.push({ fileId: out.file_id, origen: 'code' });
        }
      }
    }
  }

  return {
    containerId: response.container?.id ?? input.containerId ?? null,
    outputFiles,
    narrative: narrativeParts.join('\n\n'),
    stopReason: response.stop_reason,
    raw: response,
  };
}

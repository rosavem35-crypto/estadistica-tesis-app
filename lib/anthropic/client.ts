import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

/**
 * Key separada de la de Marco Teórico (ANTHROPIC_API_KEY_ESTADISTICA, no
 * ANTHROPIC_API_KEY) para poder medir costo/uso de este producto por
 * separado — ver CLAUDE.md.
 */
export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY_ESTADISTICA;
  if (!apiKey) {
    throw new Error(
      'Falta ANTHROPIC_API_KEY_ESTADISTICA en el entorno. Agrégala en la ' +
        'configuración de secretos del entorno (no en el código).'
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

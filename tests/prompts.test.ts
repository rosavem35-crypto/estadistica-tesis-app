import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalysisPrompt, FUNCION_POR_TIPO } from '../lib/engine/prompts';

test('FUNCION_POR_TIPO mapea confiabilidad a confiabilidad_escala', () => {
  assert.equal(FUNCION_POR_TIPO.confiabilidad, 'confiabilidad_escala');
});

test('con archivo: el prompt pide localizar y cargar el archivo', () => {
  const p = buildAnalysisPrompt('comparar_grupos', { y: 'postest', grupo: 'grupo' }, {
    nombreArchivoOriginal: 'datos.xlsx',
    conArchivo: true,
  });
  assert.match(p, /archivo de datos adjunto/);
  assert.match(p, /cargar_datos/);
  assert.match(p, /comparar_grupos/);
});

test('sin archivo: el prompt NO pide cargar ningún archivo', () => {
  const p = buildAnalysisPrompt('muestra_poblacion', { N: 1200 }, {
    nombreArchivoOriginal: 'datos',
    conArchivo: false,
  });
  assert.doesNotMatch(p, /cargar_datos/);
  assert.match(p, /NO necesita un archivo/);
  assert.match(p, /muestra_poblacion/);
});

test('conArchivo por defecto es true (compatibilidad)', () => {
  const p = buildAnalysisPrompt('descriptivos', { vars: ['edad'] }, { nombreArchivoOriginal: 'd.csv' });
  assert.match(p, /cargar_datos/);
});

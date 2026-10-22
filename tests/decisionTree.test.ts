import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANALISIS_DISPONIBLES, definicionDe } from '../lib/engine/decisionTree';

test('cada definición tiene al menos un campo', () => {
  for (const def of ANALISIS_DISPONIBLES) {
    assert.ok(def.campos.length > 0, `${def.tipo} no tiene campos`);
  }
});

test('definicionDe encuentra confiabilidad', () => {
  const def = definicionDe('confiabilidad');
  assert.equal(def.tipo, 'confiabilidad');
  assert.ok(def.campos.some((c) => c.nombre === 'items'));
});

test('definicionDe lanza error para un tipo inexistente', () => {
  // @ts-expect-error -- tipo inválido a propósito
  assert.throws(() => definicionDe('no_existe'));
});

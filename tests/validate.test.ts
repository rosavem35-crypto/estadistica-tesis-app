import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarArchivoDatos } from '../lib/validate';

test('acepta .xlsx y .csv', () => {
  assert.equal(validarArchivoDatos('datos.xlsx', 1000).ok, true);
  assert.equal(validarArchivoDatos('datos.csv', 1000).ok, true);
});

test('rechaza .sav con un mensaje específico', () => {
  const r = validarArchivoDatos('datos.sav', 1000);
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /SPSS/);
});

test('rechaza formatos desconocidos', () => {
  const r = validarArchivoDatos('datos.txt', 1000);
  assert.equal(r.ok, false);
});

test('rechaza archivos vacíos', () => {
  const r = validarArchivoDatos('datos.xlsx', 0);
  assert.equal(r.ok, false);
});

test('rechaza archivos demasiado grandes', () => {
  const r = validarArchivoDatos('datos.xlsx', 100 * 1024 * 1024);
  assert.equal(r.ok, false);
});

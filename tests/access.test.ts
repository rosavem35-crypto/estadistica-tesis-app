import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveAccess, safeRedirectPath } from '../lib/access';

test('hasActiveAccess: null/undefined es falso', () => {
  assert.equal(hasActiveAccess(null), false);
  assert.equal(hasActiveAccess(undefined), false);
});

test('hasActiveAccess: fecha futura es verdadero, pasada es falso', () => {
  const ahora = new Date('2026-01-01T00:00:00Z');
  assert.equal(hasActiveAccess('2030-01-01T00:00:00Z', ahora), true);
  assert.equal(hasActiveAccess('2020-01-01T00:00:00Z', ahora), false);
});

test('hasActiveAccess: fecha inválida es falso, no lanza', () => {
  assert.equal(hasActiveAccess('no-es-una-fecha'), false);
});

test('safeRedirectPath: rutas normales se mantienen', () => {
  assert.equal(safeRedirectPath('/subir'), '/subir');
  assert.equal(safeRedirectPath('/analisis/123'), '/analisis/123');
});

test('safeRedirectPath: bloquea redirecciones abiertas', () => {
  assert.equal(safeRedirectPath('//evil.com'), '/');
  assert.equal(safeRedirectPath('\\\\evil.com'), '/');
  assert.equal(safeRedirectPath('https://evil.com'), '/');
  assert.equal(safeRedirectPath(null), '/');
  assert.equal(safeRedirectPath(undefined, '/subir'), '/subir');
});

'use client';

import type { CampoParametro } from '@/lib/engine/decisionTree';
import type { PerfilColumna } from '@/types/analisis';

interface Props {
  campo: CampoParametro;
  valor: unknown;
  columnas: PerfilColumna[];
  onChange: (nombre: string, valor: unknown) => void;
}

/** Un campo de parámetro del formulario de análisis. Las columnas siempre se eligen de una lista — nunca texto libre. */
export function CampoInput({ campo, valor, columnas, onChange }: Props) {
  if (campo.tipo === 'columna') {
    return (
      <select
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        value={(valor as string) ?? ''}
        onChange={(e) => onChange(campo.nombre, e.target.value)}
      >
        <option value="">Selecciona una columna...</option>
        {columnas.map((c) => (
          <option key={c.nombre} value={c.nombre}>
            {c.nombre} ({c.tipoDetectado})
          </option>
        ))}
      </select>
    );
  }

  if (campo.tipo === 'columnas') {
    const seleccion = new Set((valor as string[] | undefined) ?? []);
    function alternar(nombre: string) {
      const siguiente = new Set(seleccion);
      if (siguiente.has(nombre)) siguiente.delete(nombre);
      else siguiente.add(nombre);
      onChange(campo.nombre, Array.from(siguiente));
    }
    return (
      <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-300 p-2 dark:border-slate-700">
        {columnas.length === 0 && <p className="text-xs text-slate-400">No hay columnas disponibles.</p>}
        {columnas.map((c) => (
          <label key={c.nombre} className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={seleccion.has(c.nombre)} onChange={() => alternar(c.nombre)} />
            <span>
              {c.nombre} <span className="text-slate-400">({c.tipoDetectado})</span>
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      type={campo.tipo === 'numero' ? 'number' : 'text'}
      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      value={(valor as string) ?? ''}
      onChange={(e) => onChange(campo.nombre, campo.tipo === 'numero' ? Number(e.target.value) : e.target.value)}
      placeholder={campo.ayuda}
    />
  );
}

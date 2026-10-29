'use client';

import type { CampoParametro } from '@/lib/engine/decisionTree';
import type { PerfilColumna } from '@/types/analisis';

interface Props {
  campo: CampoParametro;
  valor: unknown;
  columnas: PerfilColumna[];
  onChange: (nombre: string, valor: unknown) => void;
}

export function CampoInput({ campo, valor, columnas, onChange }: Props) {
  if (campo.tipo === 'columna') {
    return (
      <select
        className="input-field"
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
      <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
        {columnas.length === 0 && (
          <p className="px-2 py-3 text-xs text-slate-400">No hay columnas disponibles.</p>
        )}
        {columnas.map((c) => (
          <label
            key={c.nombre}
            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
              seleccion.has(c.nombre) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={seleccion.has(c.nombre)}
              onChange={() => alternar(c.nombre)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{c.nombre}</span>
            <span className="text-xs text-slate-400">{c.tipoDetectado}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      type={campo.tipo === 'numero' ? 'number' : 'text'}
      className="input-field"
      value={(valor as string) ?? ''}
      onChange={(e) => onChange(campo.nombre, campo.tipo === 'numero' ? Number(e.target.value) : e.target.value)}
      placeholder={campo.ayuda}
    />
  );
}

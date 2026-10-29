'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PerfilColumna } from '@/types/analisis';

const TIPO_ICONO: Record<string, string> = {
  numerico: '🔢',
  categorico: '🏷️',
  texto: '📝',
  fecha: '📅',
  booleano: '✅',
};

export default function PerfilarPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [columnas, setColumnas] = useState<PerfilColumna[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    fetch(`/api/analisis/${params.id}/perfil`, { method: 'POST' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo perfilar el archivo.');
        if (activo) setColumnas(data.columnas);
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'Error desconocido.');
      });
    return () => {
      activo = false;
    };
  }, [params.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-xl dark:bg-red-900/30">
            ❌
          </div>
          <h1 className="section-title !text-xl">No se pudo leer el archivo</h1>
          <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!columnas) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl animate-pulse dark:bg-indigo-900/30">
            🔬
          </div>
          <h1 className="section-title !text-xl">Revisando tu archivo...</h1>
          <p className="mt-2 section-subtitle">
            Claude está leyendo las columnas y su tipo de dato. Puede tardar hasta un minuto.
          </p>
          <div className="mt-6 flex justify-center">
            <svg className="h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="section-title">Columnas detectadas</h1>
        <p className="mt-2 section-subtitle">
          Revisamos tu archivo y encontramos {columnas.length} columnas. Verifica que los tipos sean correctos.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span>Columna</span>
          <span>Tipo</span>
          <span className="text-right">% faltante</span>
        </div>
        {columnas.map((c, i) => (
          <div
            key={c.nombre}
            className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-3 text-sm ${
              i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''
            }`}
          >
            <span className="font-medium text-slate-900 dark:text-white">{c.nombre}</span>
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="text-base">{TIPO_ICONO[c.tipoDetectado] ?? '❓'}</span>
              {c.tipoDetectado}
            </span>
            <span
              className={`text-right tabular-nums ${
                c.pctFaltante > 10
                  ? 'font-medium text-amber-500'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {c.pctFaltante}%
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push(`/subir/${params.id}/elegir`)}
        className="btn-primary mt-8 w-full sm:w-auto"
      >
        Continuar al análisis →
      </button>
    </div>
  );
}

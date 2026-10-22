'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PerfilColumna } from '@/types/analisis';

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
      <main className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">No se pudo leer el archivo</h1>
        <p className="mt-4 text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!columnas) {
    return (
      <main className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Revisando tu archivo...</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Esto puede tardar hasta un minuto — Claude está leyendo las columnas y su tipo de dato.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Columnas detectadas</h1>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="pb-2">Columna</th>
            <th className="pb-2">Tipo</th>
            <th className="pb-2">% faltante</th>
          </tr>
        </thead>
        <tbody>
          {columnas.map((c) => (
            <tr key={c.nombre} className="border-t border-slate-200 dark:border-slate-800">
              <td className="py-1.5 font-medium">{c.nombre}</td>
              <td className="py-1.5 text-slate-600 dark:text-slate-300">{c.tipoDetectado}</td>
              <td className="py-1.5 text-slate-600 dark:text-slate-300">{c.pctFaltante}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => router.push(`/subir/${params.id}/elegir`)}
        className="mt-8 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
      >
        Continuar
      </button>
    </main>
  );
}

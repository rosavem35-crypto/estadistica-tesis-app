'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ANALISIS_DISPONIBLES } from '@/lib/engine/decisionTree';

interface FilaHistorial {
  id: string;
  tipo_analisis: string;
  estado: 'pendiente' | 'procesando' | 'completado' | 'error';
  resultado_resumen: string | null;
  created_at: string;
}

const ETIQUETAS: Record<string, string> = Object.fromEntries(
  ANALISIS_DISPONIBLES.map((d) => [d.tipo, d.etiqueta])
);

const ESTADO_TXT: Record<FilaHistorial['estado'], string> = {
  pendiente: 'Pendiente',
  procesando: 'Analizando...',
  completado: 'Completado',
  error: 'Error',
};

export default function HistorialPage() {
  const [filas, setFilas] = useState<FilaHistorial[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/historial')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar el historial.');
        setFilas(data.analisis);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido.'));
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Tu historial</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!filas && !error && <p className="mt-4 text-sm text-slate-500">Cargando...</p>}
      {filas && filas.length === 0 && <p className="mt-4 text-sm text-slate-500">Todavía no has hecho ningún análisis.</p>}

      <div className="mt-6 space-y-3">
        {filas?.map((f) => (
          <Link
            key={f.id}
            href={`/analisis/${f.id}`}
            className="block rounded-md border border-slate-200 p-4 text-sm hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{ETIQUETAS[f.tipo_analisis] ?? f.tipo_analisis}</span>
              <span className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString('es')}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{ESTADO_TXT[f.estado]}</div>
            {f.resultado_resumen && (
              <p className="mt-2 line-clamp-2 text-slate-600 dark:text-slate-300">{f.resultado_resumen}</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}

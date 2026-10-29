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

const ESTADO_CONFIG: Record<FilaHistorial['estado'], { label: string; color: string; icon: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800', icon: '⏳' },
  procesando: { label: 'Analizando...', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400', icon: '🔄' },
  completado: { label: 'Completado', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400', icon: '✅' },
  error: { label: 'Error', color: 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400', icon: '❌' },
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="section-title">Tu historial</h1>
          <p className="mt-1 section-subtitle">Todos tus análisis anteriores en un solo lugar.</p>
        </div>
        <Link href="/subir" className="btn-primary hidden sm:inline-flex">
          Nuevo análisis
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {!filas && !error && (
        <div className="card p-8 text-center">
          <svg className="mx-auto h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 section-subtitle">Cargando historial...</p>
        </div>
      )}

      {filas && filas.length === 0 && (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
            📋
          </div>
          <p className="section-subtitle">Todavía no has hecho ningún análisis.</p>
          <Link href="/subir" className="btn-primary mt-4">
            Hacer tu primer análisis
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {filas?.map((f) => {
          const estado = ESTADO_CONFIG[f.estado];
          return (
            <Link key={f.id} href={`/analisis/${f.id}`} className="card-hover block p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {ETIQUETAS[f.tipo_analisis] ?? f.tipo_analisis}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(f.created_at).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium ${estado.color}`}>
                  <span>{estado.icon}</span>
                  {estado.label}
                </span>
              </div>
              {f.resultado_resumen && (
                <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {f.resultado_resumen}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <Link href="/subir" className="btn-primary mt-6 w-full sm:hidden">
        Nuevo análisis
      </Link>
    </div>
  );
}

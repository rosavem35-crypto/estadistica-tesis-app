'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface EstadoAnalisis {
  estado: 'pendiente' | 'procesando' | 'completado' | 'error';
  error_detalle?: string | null;
  resultado_resumen?: string | null;
  reporteMdUrl?: string | null;
  reporteDocxUrl?: string | null;
  reporteXlsxUrl?: string | null;
  figurasUrls?: string[];
}

export default function AnalisisPage({ params }: { params: { id: string } }) {
  const [datos, setDatos] = useState<EstadoAnalisis | null>(null);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function consultar() {
      const res = await fetch(`/api/analisis/${params.id}`);
      const data = await res.json();
      setDatos(data);
      if (data.estado === 'completado' || data.estado === 'error') {
        if (intervalo.current) clearInterval(intervalo.current);
      }
    }
    consultar();
    intervalo.current = setInterval(consultar, 4000);
    return () => {
      if (intervalo.current) clearInterval(intervalo.current);
    };
  }, [params.id]);

  if (!datos) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="card p-8 text-center">
          <svg className="mx-auto h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 section-subtitle">Cargando...</p>
        </div>
      </div>
    );
  }

  if (datos.estado === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="card p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-xl dark:bg-red-900/30">
              ⚠️
            </div>
            <h1 className="section-title !text-xl">El análisis no se pudo completar</h1>
            <p className="mt-2 section-subtitle">
              Revisa el detalle abajo. No se consumió ningún crédito.
            </p>
          </div>
          {datos.error_detalle && (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">Detalle del error</p>
              <p className="whitespace-pre-wrap">{datos.error_detalle}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/subir" className="btn-primary">
              Intentar con otros datos
            </Link>
            <button onClick={() => window.history.back()} className="btn-secondary">
              ← Volver a configurar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (datos.estado !== 'completado') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-2xl animate-pulse dark:bg-indigo-900/30">
            🧮
          </div>
          <h1 className="section-title !text-xl">Analizando tus datos...</h1>
          <p className="mt-2 section-subtitle">
            Claude está ejecutando las pruebas estadísticas. Puede tardar hasta un par de minutos.
          </p>
          <div className="mt-6 flex justify-center">
            <svg className="h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="mt-4 text-xs text-slate-400">Esta página se actualiza automáticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="section-title">Resultados</h1>
          <p className="mt-1 section-subtitle">Tu análisis se completó exitosamente.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg dark:bg-emerald-900/30">
          ✅
        </div>
      </div>

      {datos.resultado_resumen && (
        <div className="card p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Resumen de resultados
          </h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {datos.resultado_resumen}
          </div>
        </div>
      )}

      <div className="mt-6 card p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Descargar archivos
        </h2>
        <div className="flex flex-wrap gap-3">
          {datos.reporteDocxUrl && (
            <a href={datos.reporteDocxUrl} className="btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar Word
            </a>
          )}
          {datos.reporteXlsxUrl && (
            <a href={datos.reporteXlsxUrl} className="btn-secondary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Descargar Excel
            </a>
          )}
          {datos.reporteMdUrl && (
            <a href={datos.reporteMdUrl} className="btn-secondary">
              Descargar Markdown
            </a>
          )}
        </div>
      </div>

      {datos.figurasUrls && datos.figurasUrls.length > 0 && (
        <div className="mt-6 card p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Figuras
          </h2>
          <div className="space-y-4">
            {datos.figurasUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt="Figura del análisis"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/subir" className="btn-primary">
          Hacer otro análisis
        </Link>
        <Link href="/historial" className="btn-secondary">
          Ver historial
        </Link>
      </div>
    </div>
  );
}

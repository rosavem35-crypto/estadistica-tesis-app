'use client';

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
      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-sm text-slate-500">Cargando...</p>
      </main>
    );
  }

  if (datos.estado === 'error') {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Algo falló</h1>
        <p className="mt-4 text-sm text-red-600">{datos.error_detalle}</p>
      </main>
    );
  }

  if (datos.estado !== 'completado') {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Analizando tus datos...</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Puede tardar hasta un par de minutos. Esta página se actualiza sola.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Resultados</h1>

      {datos.resultado_resumen && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
          {datos.resultado_resumen}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {datos.reporteDocxUrl && (
          <a
            href={datos.reporteDocxUrl}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Descargar Word
          </a>
        )}
        {datos.reporteXlsxUrl && (
          <a
            href={datos.reporteXlsxUrl}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Descargar Excel
          </a>
        )}
        {datos.reporteMdUrl && (
          <a
            href={datos.reporteMdUrl}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Descargar Markdown
          </a>
        )}
      </div>

      {datos.figurasUrls && datos.figurasUrls.length > 0 && (
        <div className="mt-8 space-y-6">
          {datos.figurasUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Figura del análisis" className="rounded-md border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      )}
    </main>
  );
}

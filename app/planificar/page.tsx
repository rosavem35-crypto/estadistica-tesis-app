'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ANALISIS_DISPONIBLES, definicionDe } from '@/lib/engine/decisionTree';
import { CampoInput } from '@/components/analisis/CampoInput';
import type { TipoAnalisis } from '@/types/analisis';

const OPCIONES = ANALISIS_DISPONIBLES.filter((d) => !d.requiereArchivo);

export default function PlanificarPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoAnalisis>(OPCIONES[0]?.tipo);
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarValor(nombre: string, valor: unknown) {
    setValores((prev) => ({ ...prev, [nombre]: valor }));
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const crear = await fetch('/api/analisis/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoAnalisis: tipo }),
      });
      const creado = await crear.json();
      if (!crear.ok) throw new Error(creado.error ?? 'No se pudo crear el análisis.');

      const res = await fetch(`/api/analisis/${creado.id}/ejecutar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoAnalisis: tipo, parametros: valores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo ejecutar el cálculo.');
      router.push(`/analisis/${creado.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="section-title">Planificar una muestra</h1>
        <p className="mt-2 section-subtitle">
          Calcula cuántos participantes necesitas, sin subir ningún archivo de datos.
        </p>
      </div>

      <div className="card p-6">
        <div className="flex gap-2">
          {OPCIONES.map((def) => (
            <button
              key={def.tipo}
              onClick={() => { setTipo(def.tipo); setValores({}); }}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                tipo === def.tipo
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {def.etiqueta}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{definicionDe(tipo).pregunta}</p>

        <div className="mt-6 space-y-4">
          {definicionDe(tipo).campos.map((campo) => (
            <div key={campo.nombre}>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {campo.etiqueta}
                {campo.requerido && <span className="ml-1 text-red-400">*</span>}
              </label>
              <CampoInput campo={campo} valor={valores[campo.nombre]} columnas={[]} onChange={actualizarValor} />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <button onClick={enviar} disabled={enviando} className="btn-primary mt-6 w-full sm:w-auto">
        {enviando ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Calculando...
          </>
        ) : (
          'Calcular'
        )}
      </button>
    </div>
  );
}

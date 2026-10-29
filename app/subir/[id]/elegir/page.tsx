'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ANALISIS_DISPONIBLES, ETIQUETAS_CATEGORIA, definicionDe, type DefinicionAnalisis } from '@/lib/engine/decisionTree';
import { CampoInput } from '@/components/analisis/CampoInput';
import type { PerfilColumna, TipoAnalisis } from '@/types/analisis';

const OPCIONES = ANALISIS_DISPONIBLES.filter((d) => d.requiereArchivo);
const CATEGORIAS: DefinicionAnalisis['categoria'][] = ['diagnostico', 'comparar', 'relacionar', 'predecir'];

const ICONO_CATEGORIA: Record<string, string> = {
  diagnostico: '🔍',
  comparar: '⚖️',
  relacionar: '🔗',
  predecir: '🎯',
};

export default function ElegirPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [columnas, setColumnas] = useState<PerfilColumna[]>([]);
  const [tipo, setTipo] = useState<TipoAnalisis | null>(null);
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/analisis/${params.id}`)
      .then((res) => res.json())
      .then((data) => setColumnas(data.perfil_columnas ?? []))
      .catch(() => setColumnas([]));
  }, [params.id]);

  function actualizarValor(nombre: string, valor: unknown) {
    setValores((prev) => ({ ...prev, [nombre]: valor }));
  }

  async function enviar() {
    if (!tipo) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/analisis/${params.id}/ejecutar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoAnalisis: tipo, parametros: valores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo ejecutar el análisis.');
      router.push(`/analisis/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="section-title">¿Qué quieres analizar?</h1>
        <p className="mt-2 section-subtitle">
          Selecciona el tipo de análisis que necesitas para tu investigación.
          {' '}
          <a href="/planificar" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            ¿Solo necesitas calcular muestra? →
          </a>
        </p>
      </div>

      <div className="space-y-6">
        {CATEGORIAS.map((cat) => {
          const opciones = OPCIONES.filter((d) => d.categoria === cat);
          if (opciones.length === 0) return null;
          return (
            <div key={cat}>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span>{ICONO_CATEGORIA[cat]}</span>
                {ETIQUETAS_CATEGORIA[cat]}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {opciones.map((def) => {
                  const seleccionado = tipo === def.tipo;
                  return (
                    <button
                      key={def.tipo}
                      type="button"
                      onClick={() => { setTipo(def.tipo); setValores({}); setError(null); }}
                      className={`card-hover cursor-pointer p-4 text-left transition-all ${
                        seleccionado
                          ? '!ring-2 !ring-indigo-500 !bg-indigo-50/50 dark:!bg-indigo-500/5'
                          : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {def.etiqueta}
                      </span>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {def.pregunta}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {tipo && (
        <div className="mt-8 card p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Configura: {definicionDe(tipo).etiqueta}
          </h3>
          <div className="space-y-4">
            {definicionDe(tipo).campos.map((campo) => (
              <div key={campo.nombre}>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {campo.etiqueta}
                  {campo.requerido && <span className="ml-1 text-red-400">*</span>}
                </label>
                <CampoInput campo={campo} valor={valores[campo.nombre]} columnas={columnas} onChange={actualizarValor} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <span className="text-base">💡</span>
            <span>Este análisis consume 1 crédito de tu plan.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <button onClick={enviar} disabled={!tipo || enviando} className="btn-primary mt-8 w-full sm:w-auto">
        {enviando ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analizando... (puede tardar un minuto)
          </>
        ) : (
          'Analizar'
        )}
      </button>
    </div>
  );
}

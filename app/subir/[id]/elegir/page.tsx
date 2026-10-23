'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ANALISIS_DISPONIBLES, ETIQUETAS_CATEGORIA, definicionDe, type DefinicionAnalisis } from '@/lib/engine/decisionTree';
import { CampoInput } from '@/components/analisis/CampoInput';
import type { PerfilColumna, TipoAnalisis } from '@/types/analisis';

// Esta página siempre viene de /subir (hay un archivo asociado), así que
// solo se ofrecen los tipos que necesitan datos. muestra_poblacion y
// potencia_muestra viven en /planificar (no piden archivo).
const OPCIONES = ANALISIS_DISPONIBLES.filter((d) => d.requiereArchivo);
const CATEGORIAS: DefinicionAnalisis['categoria'][] = ['diagnostico', 'comparar', 'relacionar', 'predecir'];

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
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">¿Qué quieres analizar?</h1>
      <p className="mt-2 text-sm text-slate-500">
        ¿Necesitas calcular un tamaño de muestra sin subir datos?{' '}
        <a href="/planificar" className="underline">
          Ve directo a planificación
        </a>
        .
      </p>

      {CATEGORIAS.map((cat) => {
        const opciones = OPCIONES.filter((d) => d.categoria === cat);
        if (opciones.length === 0) return null;
        return (
          <div key={cat} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {ETIQUETAS_CATEGORIA[cat]}
            </h2>
            <div className="mt-2 space-y-2">
              {opciones.map((def) => (
                <label
                  key={def.tipo}
                  className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"
                >
                  <input
                    type="radio"
                    name="tipo"
                    checked={tipo === def.tipo}
                    onChange={() => {
                      setTipo(def.tipo);
                      setValores({});
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{def.etiqueta}</span>
                    <br />
                    <span className="text-slate-500">{def.pregunta}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {tipo && (
        <div className="mt-6 space-y-4">
          {definicionDe(tipo).campos.map((campo) => (
            <div key={campo.nombre}>
              <label className="block text-sm font-medium">{campo.etiqueta}</label>
              <CampoInput campo={campo} valor={valores[campo.nombre]} columnas={columnas} onChange={actualizarValor} />
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={enviar}
        disabled={!tipo || enviando}
        className="mt-8 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
      >
        {enviando ? 'Analizando... (puede tardar un minuto)' : 'Analizar'}
      </button>
    </main>
  );
}

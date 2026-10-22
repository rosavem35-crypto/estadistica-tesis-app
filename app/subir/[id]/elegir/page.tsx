'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ANALISIS_DISPONIBLES, definicionDe, type CampoParametro } from '@/lib/engine/decisionTree';
import type { PerfilColumna, TipoAnalisis } from '@/types/analisis';

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

  function renderCampo(campo: CampoParametro) {
    if (campo.tipo === 'columna') {
      return (
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={(valores[campo.nombre] as string) ?? ''}
          onChange={(e) => actualizarValor(campo.nombre, e.target.value)}
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
      return (
        <select
          multiple
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={(valores[campo.nombre] as string[]) ?? []}
          onChange={(e) =>
            actualizarValor(
              campo.nombre,
              Array.from(e.target.selectedOptions).map((o) => o.value)
            )
          }
        >
          {columnas.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre} ({c.tipoDetectado})
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={campo.tipo === 'numero' ? 'number' : 'text'}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        value={(valores[campo.nombre] as string) ?? ''}
        onChange={(e) =>
          actualizarValor(campo.nombre, campo.tipo === 'numero' ? Number(e.target.value) : e.target.value)
        }
        placeholder={campo.ayuda}
      />
    );
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

      <div className="mt-6 space-y-2">
        {ANALISIS_DISPONIBLES.map((def) => (
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

      {tipo && (
        <div className="mt-6 space-y-4">
          {definicionDe(tipo).campos.map((campo) => (
            <div key={campo.nombre}>
              <label className="block text-sm font-medium">{campo.etiqueta}</label>
              {renderCampo(campo)}
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

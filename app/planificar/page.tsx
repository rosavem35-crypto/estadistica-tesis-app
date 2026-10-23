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
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Planificar una muestra</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Calcula cuántos participantes necesitas, sin subir ningún archivo de datos.
      </p>

      <div className="mt-6 flex gap-2 text-sm">
        {OPCIONES.map((def) => (
          <button
            key={def.tipo}
            onClick={() => {
              setTipo(def.tipo);
              setValores({});
            }}
            className={`rounded-md px-3 py-1.5 ${tipo === def.tipo ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 dark:border-slate-700'}`}
          >
            {def.etiqueta}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-500">{definicionDe(tipo).pregunta}</p>

      <div className="mt-4 space-y-4">
        {definicionDe(tipo).campos.map((campo) => (
          <div key={campo.nombre}>
            <label className="block text-sm font-medium">{campo.etiqueta}</label>
            <CampoInput campo={campo} valor={valores[campo.nombre]} columnas={[]} onChange={actualizarValor} />
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-8 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
      >
        {enviando ? 'Calculando...' : 'Calcular'}
      </button>
    </main>
  );
}

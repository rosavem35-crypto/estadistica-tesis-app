'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SubirPage() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [privacidadConfirmada, setPrivacidadConfirmada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (!archivo) {
      setError('Selecciona un archivo .xlsx o .csv.');
      return;
    }
    if (!privacidadConfirmada) {
      setError('Debes confirmar la casilla de privacidad.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      form.append('privacidadConfirmada', 'true');
      const res = await fetch('/api/analisis/subir', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo subir el archivo.');
      router.push(`/subir/${data.id}/perfilar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
      setEnviando(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sube tus datos</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Archivo .xlsx o .csv con tu base de datos. No .sav de SPSS por ahora.
      </p>

      <div className="mt-6">
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </div>

      <label className="mt-6 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={privacidadConfirmada}
          onChange={(e) => setPrivacidadConfirmada(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Confirmo que este archivo no incluye nombres, DNI, correos ni otros datos que
          identifiquen a las personas participantes (Ley 29733 en Perú / LFPDPPP en México).
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
      >
        {enviando ? 'Subiendo...' : 'Continuar'}
      </button>
    </main>
  );
}

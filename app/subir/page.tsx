'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

export default function SubirPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [privacidadConfirmada, setPrivacidadConfirmada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      setError('Solo se aceptan archivos .xlsx o .csv');
      return;
    }
    setArchivo(file);
    setError(null);
  }

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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="section-title">Sube tus datos</h1>
        <p className="mt-2 section-subtitle">
          Archivo Excel (.xlsx) o CSV con tu base de datos. No .sav de SPSS por ahora.
        </p>
      </div>

      <div className="card p-6 sm:p-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5'
              : archivo
                ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-500/5'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:border-indigo-700 dark:hover:bg-slate-800/50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          {archivo ? (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-900/30">
                ✅
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{archivo.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                {(archivo.size / 1024).toFixed(0)} KB — Clic para cambiar
              </p>
            </>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
                📁
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="mt-1 text-xs text-slate-400">.xlsx o .csv</p>
            </>
          )}
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
          <input
            type="checkbox"
            checked={privacidadConfirmada}
            onChange={(e) => setPrivacidadConfirmada(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-slate-600 dark:text-slate-300">
            Confirmo que este archivo no incluye nombres, DNI, correos ni otros datos que
            identifiquen a las personas participantes (Ley 29733 / LFPDPPP).
          </span>
        </label>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button onClick={enviar} disabled={enviando} className="btn-primary mt-6 w-full">
          {enviando ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Subiendo...
            </>
          ) : (
            'Continuar'
          )}
        </button>
      </div>
    </div>
  );
}

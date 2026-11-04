'use client';

import { useEffect, useState } from 'react';

const RECARGA_URL = process.env.NEXT_PUBLIC_HOTMART_RECARGA_URL;

interface UsageData {
  creditos_usados: number;
  creditos_limite: number;
}

interface Props {
  modo?: 'compacto' | 'completo';
}

export function RecargaBanner({ modo = 'compacto' }: Props) {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const disponibles = data.creditos_limite - data.creditos_usados;
  const bajo = disponibles <= 3 && disponibles > 0;
  const agotado = disponibles <= 0;

  if (!bajo && !agotado) return null;

  if (modo === 'completo' && agotado) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-xl dark:bg-red-900/30">
          ⚡
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Se agotaron tus créditos de análisis
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Tu cuenta sigue activa de por vida. Recarga para seguir analizando tus datos.
        </p>
        {RECARGA_URL ? (
          <a
            href={RECARGA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-4"
          >
            Recargar 10 análisis — $5 USD
          </a>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            Contacta a soporte para adquirir más créditos.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        agotado
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-amber-50 dark:bg-amber-900/20'
      }`}
    >
      <span className="text-lg">{agotado ? '⚡' : '⚠️'}</span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${agotado ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {agotado
            ? 'Sin créditos disponibles'
            : `Te quedan solo ${disponibles} análisis`}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {agotado
            ? 'Necesitas recargar para ejecutar un análisis.'
            : 'Considera recargar pronto para no quedarte sin acceso.'}
        </p>
      </div>
      {RECARGA_URL && (
        <a
          href={RECARGA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Recargar — $5
        </a>
      )}
    </div>
  );
}

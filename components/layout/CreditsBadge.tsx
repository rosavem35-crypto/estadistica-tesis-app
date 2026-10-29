'use client';

import { useEffect, useState } from 'react';

interface UsageData {
  plan: string;
  creditos_usados: number;
  creditos_limite: number;
  active_until: string;
}

const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  admin: 'Admin',
};

export function CreditsBadge() {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const disponibles = data.creditos_limite - data.creditos_usados;
  const pct = data.creditos_limite > 0 ? (data.creditos_usados / data.creditos_limite) * 100 : 0;
  const bajo = disponibles <= 3;
  const agotado = disponibles <= 0;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-2.5 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/80 dark:ring-slate-700/60">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {PLAN_LABELS[data.plan] ?? data.plan}
          </span>
          <span
            className={`text-xs font-bold tabular-nums ${
              agotado ? 'text-red-500' : bajo ? 'text-amber-500' : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {disponibles}/{data.creditos_limite}
          </span>
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${
              agotado ? 'bg-red-500' : bajo ? 'bg-amber-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
      {agotado && (
        <span className="text-[10px] font-medium text-red-500">Sin créditos</span>
      )}
    </div>
  );
}

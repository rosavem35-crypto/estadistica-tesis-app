'use client';

const PASOS = [
  { num: 1, etiqueta: 'Cargar datos', icono: '📂', ruta: '/subir' },
  { num: 2, etiqueta: 'Diagnóstico', icono: '🔬', ruta: '/perfilar' },
  { num: 3, etiqueta: 'Configuración', icono: '⚙️', ruta: '/elegir' },
  { num: 4, etiqueta: 'Resultados', icono: '📊', ruta: '/analisis' },
] as const;

interface Props {
  pasoActual: 1 | 2 | 3 | 4;
}

export function AnalysisStepper({ pasoActual }: Props) {
  return (
    <nav aria-label="Progreso del análisis" className="w-full">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {PASOS.map((paso, i) => {
          const completado = paso.num < pasoActual;
          const activo = paso.num === pasoActual;
          return (
            <li key={paso.num} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        completado || activo ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition-all ${
                      completado
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                        : activo
                          ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20 shadow-md shadow-indigo-500/25'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    {completado ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-base leading-none">{paso.icono}</span>
                    )}
                  </div>
                  {i < PASOS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        completado ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${
                    completado || activo ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {paso.etiqueta}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

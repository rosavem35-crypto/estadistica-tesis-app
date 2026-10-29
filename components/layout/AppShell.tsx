'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnalysisStepper } from './AnalysisStepper';
import { CreditsBadge } from './CreditsBadge';

function detectarPaso(pathname: string): 1 | 2 | 3 | 4 | null {
  if (pathname === '/subir') return 1;
  if (pathname.includes('/perfilar')) return 2;
  if (pathname.includes('/elegir')) return 3;
  if (pathname.startsWith('/analisis/')) return 4;
  return null;
}

const RUTAS_CON_STEPPER = ['/subir', '/perfilar', '/elegir', '/analisis/'];
const RUTAS_AUTENTICADAS = ['/subir', '/analisis', '/historial', '/planificar', '/perfilar', '/elegir'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const paso = detectarPaso(pathname);
  const mostrarStepper = RUTAS_CON_STEPPER.some((r) => pathname === r || pathname.includes(r));
  const esRutaAuth = RUTAS_AUTENTICADAS.some((r) => pathname === r || pathname.startsWith(`${r}/`) || pathname.includes(r));
  const esLogin = pathname === '/iniciar-sesion';
  const esHome = pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
              E
            </div>
            <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors dark:text-slate-200 dark:group-hover:text-indigo-400 hidden sm:inline">
              Estadística Tesis
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {esRutaAuth && <CreditsBadge />}
            {!esLogin && !esRutaAuth && !esHome && (
              <Link
                href="/iniciar-sesion"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
            {esRutaAuth && (
              <nav className="hidden items-center gap-1 sm:flex">
                <Link
                  href="/historial"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    pathname === '/historial'
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Historial
                </Link>
                <Link
                  href="/subir"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    pathname === '/subir'
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Nuevo análisis
                </Link>
              </nav>
            )}
          </div>
        </div>

        {mostrarStepper && paso && (
          <div className="mx-auto max-w-2xl px-4 pb-3 sm:px-6">
            <AnalysisStepper pasoActual={paso} />
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-400 dark:border-slate-800/60 dark:text-slate-500">
        Estadística para tesis — Asistente IA para investigadores
      </footer>
    </div>
  );
}

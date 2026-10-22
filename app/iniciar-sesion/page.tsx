'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// Se crea solo dentro de los handlers (nunca durante el render) para que el
// prerenderizado estático de Next.js no intente construir el cliente antes
// de que existan las variables de entorno de Supabase.
function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase no está configurado todavía.');
  }
  return createBrowserClient(url, anon);
}

export default function IniciarSesionPage() {
  const [modo, setModo] = useState<'enlace' | 'contrasena'>('enlace');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviarEnlace(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setMensaje(null);
    try {
      // shouldCreateUser: false — las cuentas solo se crean server-side desde
      // el webhook de Hotmart al momento de la compra, nunca por auto-registro.
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) setError(error.message);
      else setMensaje('Te enviamos un enlace de acceso a tu correo. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    }
    setEnviando(false);
  }

  async function entrarConContrasena(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = '/subir';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    }
    setEnviando(false);
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-slate-500">
        Solo investigadores con una compra activa tienen acceso. Si acabas de comprar, revisa tu correo para
        aceptar la invitación.
      </p>

      <div className="mt-6 flex gap-2 text-sm">
        <button
          onClick={() => setModo('enlace')}
          className={`rounded-md px-3 py-1.5 ${modo === 'enlace' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 dark:border-slate-700'}`}
        >
          Enlace por correo
        </button>
        <button
          onClick={() => setModo('contrasena')}
          className={`rounded-md px-3 py-1.5 ${modo === 'contrasena' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 dark:border-slate-700'}`}
        >
          Contraseña
        </button>
      </div>

      <form onSubmit={modo === 'enlace' ? enviarEnlace : entrarConContrasena} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {modo === 'contrasena' && (
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {enviando ? 'Enviando...' : modo === 'enlace' ? 'Enviar enlace' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

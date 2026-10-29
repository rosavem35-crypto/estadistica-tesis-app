'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white shadow-sm">
            🔐
          </div>
          <h1 className="section-title !text-xl">Iniciar sesión</h1>
          <p className="mt-2 section-subtitle">
            Solo investigadores con una compra activa tienen acceso.
          </p>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setModo('enlace')}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              modo === 'enlace'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Enlace por correo
          </button>
          <button
            onClick={() => setModo('contrasena')}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              modo === 'contrasena'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Contraseña
          </button>
        </div>

        <form onSubmit={modo === 'enlace' ? enviarEnlace : entrarConContrasena} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@correo.com"
            />
          </div>
          {modo === 'contrasena' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          {mensaje && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              {mensaje}
            </div>
          )}

          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? 'Enviando...' : modo === 'enlace' ? 'Enviar enlace' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

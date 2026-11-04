import Link from 'next/link';

const RECARGA_URL = process.env.NEXT_PUBLIC_HOTMART_RECARGA_URL;

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-amber-900/30">
          🔒
        </div>
        <h1 className="section-title !text-xl">Tu acceso no está activo</h1>
        <p className="mt-3 section-subtitle">
          Esto puede pasar si agotaste tus créditos, tu compra fue reembolsada o cancelada.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {RECARGA_URL && (
            <a
              href={RECARGA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Recargar 10 análisis — $5 USD
            </a>
          )}
          <Link href="/iniciar-sesion" className="btn-secondary">
            Iniciar sesión con otra cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}

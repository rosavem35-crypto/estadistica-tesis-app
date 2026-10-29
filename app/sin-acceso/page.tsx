import Link from 'next/link';

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-amber-900/30">
          🔒
        </div>
        <h1 className="section-title !text-xl">Tu acceso no está activo</h1>
        <p className="mt-3 section-subtitle">
          Esto puede pasar si tu compra fue reembolsada o cancelada, o si agotaste tus créditos.
          Compra o renueva para seguir analizando tus datos.
        </p>
        <Link href="/iniciar-sesion" className="btn-primary mt-6">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}

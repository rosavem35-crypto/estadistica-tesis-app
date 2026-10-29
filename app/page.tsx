import Link from 'next/link';

const FEATURES = [
  {
    icon: '📊',
    title: 'Tablas APA 7',
    desc: 'Tablas con formato listo para pegar en tu tesis o artículo, sin ajustes manuales.',
  },
  {
    icon: '📈',
    title: 'Figuras automáticas',
    desc: 'Gráficos claros y publicables generados junto con cada análisis estadístico.',
  },
  {
    icon: '✍️',
    title: 'Redacción de resultados',
    desc: 'Párrafos en español que interpretan los resultados siguiendo normas APA 7.',
  },
  {
    icon: '🧠',
    title: 'Justificación de método',
    desc: 'Explicación de por qué se eligió cada prueba, útil para la defensa de tu tesis.',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl text-white shadow-lg shadow-indigo-500/25">
          📐
        </div>
        <h1 className="section-title !text-3xl sm:!text-4xl">
          Análisis estadístico
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
            asistido por IA
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg section-subtitle !text-base">
          Sube tus datos y recibe tablas APA 7, figuras y redacción de resultados lista
          para tu tesis — sin SPSS, Jamovi ni R.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/subir" className="btn-primary !px-8 !py-3 !text-base">
            Subir mis datos
          </Link>
          <Link href="/planificar" className="btn-secondary !py-3">
            Calcular muestra
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <div className="mb-3 text-2xl">{f.icon}</div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link href="/iniciar-sesion" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          ¿Ya tienes cuenta? Iniciar sesión →
        </Link>
      </div>
    </div>
  );
}

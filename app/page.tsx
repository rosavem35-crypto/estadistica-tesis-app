import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Estadística para tesis</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        Sube tus datos y recibe tablas en formato APA 7, figuras y redacción de
        resultados lista para pegar en tu tesis o artículo — sin necesitar SPSS,
        Jamovi ni R.
      </p>
      <Link
        href="/subir"
        className="mt-8 inline-block rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
      >
        Subir mis datos
      </Link>
    </main>
  );
}

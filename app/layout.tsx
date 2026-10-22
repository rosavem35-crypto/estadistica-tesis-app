import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Estadística para tesis — Análisis asistido por IA',
  description:
    'Sube tus datos y recibe tablas APA 7, figuras y redacción de resultados lista para tu tesis, sin SPSS.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

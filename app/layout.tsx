import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evaluación Técnica HubSpot | Politécnico Internacional',
  description:
    'Portal de evaluación técnica de HubSpot (Marketing Hub y Sales Hub) para el proceso de selección del puesto Analista de Datos y CRM.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
                PI
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Politécnico Internacional</p>
                <p className="text-xs text-slate-500">Evaluación técnica HubSpot</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4">
          <p className="text-center text-xs text-slate-500">
            Politécnico Internacional — Proceso de selección · Analista de Datos y CRM (HubSpot)
          </p>
        </footer>
      </body>
    </html>
  );
}

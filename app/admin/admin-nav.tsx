import Link from 'next/link';
import { logoutAction } from './actions';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/preguntas', label: 'Preguntas' },
  { href: '/admin/clave', label: 'Clave de respuestas' },
];

export default function AdminNav() {
  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            {l.label}
          </Link>
        ))}
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}

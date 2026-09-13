import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">
          Evaluación técnica de HubSpot
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Puesto: <strong>Analista de Datos y CRM</strong>
        </p>

        <div className="mt-6 space-y-4 text-slate-700">
          <p>
            Esta evaluación mide tu dominio de <strong>HubSpot CRM</strong> (módulos{' '}
            <strong>Marketing Hub</strong> y <strong>Sales Hub</strong>): conceptos
            fundamentales, automatización, analítica e integraciones.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-2xl font-bold text-indigo-600">8</p>
              <p className="text-sm text-slate-600">
                preguntas básicas · conceptos del CRM
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-2xl font-bold text-indigo-600">8</p>
              <p className="text-sm text-slate-600">
                preguntas intermedias · workflows, scoring y reportes
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-2xl font-bold text-indigo-600">6</p>
              <p className="text-sm text-slate-600">
                preguntas avanzadas · API, webhooks y atribución
              </p>
            </div>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Preguntas de selección única, selección múltiple y verdadero/falso.</li>
            <li>Duración estimada: 20–30 minutos.</li>
            <li>
              Un solo envío por correo electrónico: revisa tus respuestas antes de
              finalizar.
            </li>
            <li>
              Al enviar verás la confirmación, pero <strong>no</strong> tu puntaje ni
              las respuestas correctas.
            </li>
          </ul>
        </div>

        <Link
          href="/evaluacion"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Iniciar evaluación
        </Link>
      </section>
    </div>
  );
}

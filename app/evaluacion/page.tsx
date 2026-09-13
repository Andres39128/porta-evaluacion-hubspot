import EvaluationForm from '@/components/evaluation-form';

export const metadata = {
  title: 'Evaluación | Politécnico Internacional',
};

export default function EvaluacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluación técnica HubSpot</h1>
        <p className="mt-1 text-sm text-slate-600">
          Completa tus datos y responde todas las preguntas. Tu envío se registra una
          sola vez por correo.
        </p>
      </div>
      <EvaluationForm />
    </div>
  );
}

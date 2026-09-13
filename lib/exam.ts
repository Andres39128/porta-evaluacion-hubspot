// Configuración del examen — compartida servidor/cliente (sin secretos).

/** Tiempo máximo del examen en minutos. */
export const EXAM_TIME_LIMIT_MINUTES = 20;

/** Tolerancia del servidor para envíos tardíos (latencia de red), en segundos. */
export const EXAM_GRACE_SECONDS = 120;

export type EndReason = 'submitted' | 'timeout' | 'left_screen' | 'offline' | 'expired';

export const END_REASON_LABELS: Record<EndReason, string> = {
  submitted: 'Envío normal',
  timeout: 'Tiempo agotado',
  left_screen: 'Salió de la pantalla',
  offline: 'Se desconectó',
  expired: 'Sesión expirada',
};

export function isEndReason(value: unknown): value is EndReason {
  return (
    value === 'submitted' ||
    value === 'timeout' ||
    value === 'left_screen' ||
    value === 'offline' ||
    value === 'expired'
  );
}

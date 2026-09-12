import { Badge } from '../ui/primitives';
import { useApiHealth } from './use-api-health';

/** Present in the header of every screen; degrades cleanly when the API is not running. */
export function HealthIndicator() {
  const health = useApiHealth();

  if (health.kind === 'loading') {
    return <Badge label="API: consultando…" tone="neutral" />;
  }

  if (health.kind === 'ok') {
    const { status, database } = health.response;

    return (
      <Badge
        label={`API: ${status} · banco: ${database}`}
        tone={status === 'ok' ? 'positive' : 'warning'}
      />
    );
  }

  if (health.kind === 'invalid') {
    return <Badge label="API: contrato divergente" tone="danger" />;
  }

  return <Badge label="API: fora do ar" tone="neutral" />;
}

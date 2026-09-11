import { View } from 'react-native';

import { Badge, Body } from '../ui/primitives';
import { useApiHealth } from './use-api-health';

/** Present on all three screens; degrades cleanly when the API is not running. */
export function HealthIndicator() {
  const health = useApiHealth();

  if (health.kind === 'loading') {
    return <Badge label="API: consultando…" tone="neutral" />;
  }

  if (health.kind === 'ok') {
    const { status, database } = health.response;
    return (
      <View>
        <Badge
          label={`API: ${status} · banco: ${database}`}
          tone={status === 'ok' ? 'positive' : 'warning'}
        />
      </View>
    );
  }

  if (health.kind === 'invalid') {
    return <Badge label="API: contrato divergente" tone="danger" />;
  }

  return (
    <View>
      <Badge label="API: fora do ar" tone="neutral" />
      <Body muted style={{ fontSize: 11 }}>
        as telas seguem com dados locais
      </Body>
    </View>
  );
}

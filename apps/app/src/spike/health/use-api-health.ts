import { healthResponseSchema, type HealthResponse } from '@petdots/contracts';
import { useEffect, useState } from 'react';

/**
 * The one real network call of the spike (ADR-0008, D4). Everything else is a
 * local fixture, so this is what proves the client reaches the Nest API and
 * parses the response with the schema published in `packages/contracts` —
 * the axis fixtures cannot cover.
 *
 * The API is not required to be running: a spike screen that breaks because a
 * backend is down would be judging the wrong thing.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiHealth =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ok'; readonly response: HealthResponse }
  | { readonly kind: 'unreachable'; readonly detail: string }
  | { readonly kind: 'invalid'; readonly detail: string };

export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function check(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        const parsed = healthResponseSchema.safeParse(payload);

        if (!parsed.success) {
          setHealth({ kind: 'invalid', detail: 'resposta fora do contrato publicado' });
          return;
        }
        setHealth({ kind: 'ok', response: parsed.data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setHealth({
          kind: 'unreachable',
          detail: error instanceof Error ? error.message : 'falha de rede',
        });
      }
    }

    void check();
    return () => controller.abort();
  }, []);

  return health;
}

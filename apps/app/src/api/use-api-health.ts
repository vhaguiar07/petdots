import { type HealthResponse, healthResponseSchema } from '@petdots/contracts';
import { useEffect, useState } from 'react';

import { API_BASE_URL } from './http';

/**
 * Whether the API is answering, for the badge in the header.
 *
 * Kept after the spike because it is the cheapest way to tell "the screen is
 * empty because nobody sells this" apart from "the screen is empty because the
 * backend is down" — the distinction that costs the most time in development.
 *
 * ⚠️ In the browser it also reports on **CORS**: a `CORS_ORIGINS` missing from
 * the API's environment makes this say "fora do ar" with the API perfectly up
 * (DEVELOPMENT_GUIDE).
 *
 * 🔴 This is the one call that does **not** go through `createHttpClient`, and
 * deliberately: health answers `503` with a full body when the database is
 * down, and `getJson` turns every non-2xx into an `ApiError`, discarding
 * exactly the payload this badge exists to show ("banco: down"). The base URL
 * still comes from `http.ts`, so `EXPO_PUBLIC_API_URL` is read in one place.
 */
export type ApiHealth =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ok'; readonly response: HealthResponse }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'invalid' };

export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function check(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
          signal: controller.signal,
        });
        const parsed = healthResponseSchema.safeParse(await response.json());

        setHealth(parsed.success ? { kind: 'ok', response: parsed.data } : { kind: 'invalid' });
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setHealth({ kind: 'unreachable' });
      }
    }

    void check();

    return () => {
      controller.abort();
    };
  }, []);

  return health;
}

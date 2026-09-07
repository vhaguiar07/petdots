import { z } from 'zod';

/**
 * Health of the API as a whole. `degraded` means the process is up but a
 * dependency it needs is not — the response still carries this shape, so a
 * client parses success and failure with the same schema (OBSERVABILITY).
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

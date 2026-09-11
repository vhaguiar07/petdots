import type { WaitlistSource } from '@petdots/contracts';

/** A lead already stored: normalised, dated and identified. */
export interface WaitlistEntry {
  id: string;
  name: string;
  /** E.164 — the lead's identity (pd-09, A9). */
  phone: string;
  neighborhood: string;
  /** Eight digits, no hyphen. */
  postalCode: string;
  petFoodDeclared: string | null;
  source: WaitlistSource;
  consentAt: Date;
  createdAt: Date;
}

/** What the use case hands the repository: everything but what the database owns. */
export type NewWaitlistEntry = Omit<WaitlistEntry, 'id' | 'createdAt'>;

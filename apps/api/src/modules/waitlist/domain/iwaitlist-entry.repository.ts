import type { NewWaitlistEntry, WaitlistEntry } from './waitlist-entry.js';

/** Injection token for the port — the domain never names its adapter. */
export const WAITLIST_ENTRY_REPOSITORY = Symbol('IWaitlistEntryRepository');

export interface IWaitlistEntryRepository {
  /** Throws `WaitlistEntryAlreadyExistsError` when the phone is taken. */
  create(entry: NewWaitlistEntry): Promise<WaitlistEntry>;
}

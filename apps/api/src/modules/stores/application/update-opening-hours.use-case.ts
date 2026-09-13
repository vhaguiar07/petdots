import { Inject, Injectable, Logger } from '@nestjs/common';
import { openingHoursSchema, type Store as StoreContract } from '@petdots/contracts';

import { type IStoreRepository, STORE_REPOSITORY } from '../domain/istore.repository.js';
import { StoreNotFoundError } from '../domain/store-not-found.error.js';

/**
 * The `OWNER` rewrites the weekly schedule (ADR-0013 B4, ADR-0017 A11).
 *
 * Until pd-16 the seed was the only writer, which meant a pilot store changing
 * its Saturday needed a commit. This is one of the two owner-only capabilities
 * of the panel, and the one that makes the `OWNER` × `OPERATOR` split provable
 * by test rather than merely declared.
 *
 * ⚠️ **No audit line.** `SECURITY` §Auditoria names four mutations that must
 * leave a trail — accepting, refusing, changing a price and moving money — and
 * the schedule is not among them. `stores.updated_at` answers "when", and the
 * log line below answers "who", without widening `entityType` for a fact nobody
 * has asked to reconstruct. The trigger to add it: the first dispute about a
 * store being closed when the tutor says it was open.
 *
 * The schedule is re-validated here even though the DTO already parsed it. The
 * duplication is deliberate: this use case is reachable from a future console
 * or a script, and the invariant "no overlapping stretches" belongs to the
 * store, not to one HTTP route.
 */
@Injectable()
export class UpdateOpeningHoursUseCase {
  private readonly logger = new Logger(UpdateOpeningHoursUseCase.name);

  constructor(
    @Inject(STORE_REPOSITORY)
    private readonly repository: IStoreRepository,
  ) {}

  async execute(storeId: string, userId: string, openingHours: unknown): Promise<StoreContract> {
    const parsed = openingHoursSchema.parse(openingHours);

    const store = await this.repository.updateOpeningHours(storeId, parsed);

    if (!store) {
      throw new StoreNotFoundError(storeId);
    }

    // An empty week is legal and means the shop stops taking orders, so it is
    // worth a line of its own: "0 intervals" in the log is the trace of a
    // store that will answer `409 STORE_CLOSED` to everything from now on.
    this.logger.log(
      `opening hours updated (storeId=${storeId}, userId=${userId}, ` +
        `intervals=${String(parsed.length)})`,
    );

    return store;
  }
}

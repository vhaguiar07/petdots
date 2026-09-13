import type { OrderStatus } from '@petdots/contracts';
import { DomainError } from '@petdots/domain';

/**
 * The order is not in a state from which that move is allowed.
 *
 * Raised by the pure transition functions **and** by the repository when the
 * compare-and-set writes zero rows — the two are the same fact seen at
 * different moments: the second means somebody got there first.
 */
export class InvalidOrderTransitionError extends DomainError {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`an order cannot go from ${from} to ${to}`);
  }
}

/**
 * Base for domain rule violations. Keeping a typed root lets the HTTP layer
 * map domain failures without inspecting messages (CODING_STANDARDS).
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

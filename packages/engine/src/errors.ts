/**
 * A Phase names a call pattern the engine has no Budget Class rule for. A
 * data problem, surfaced rather than defaulted to either pattern.
 */
export class UnknownCallPatternError extends Error {
  readonly callPattern: string;

  constructor(callPattern: string) {
    super(`unknown call pattern "${callPattern}": expected "loop" or "one-shot"`);
    this.name = "UnknownCallPatternError";
    this.callPattern = callPattern;
  }
}

/**
 * A Selection names a Subscription the payload does not hold, a Plan the
 * Subscription does not declare, or the same Subscription twice. Surfaced
 * rather than resolved to an empty pool, so a typo never looks like "no
 * model fits".
 */
export class InvalidSelectionError extends Error {
  readonly subscription: string;

  constructor(subscription: string, detail: string) {
    super(`invalid selection for subscription "${subscription}": ${detail}`);
    this.name = "InvalidSelectionError";
    this.subscription = subscription;
  }
}

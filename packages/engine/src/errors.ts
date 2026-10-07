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

export interface DataError {
  file: string;
  field: string;
  message: string;
}

export class DataValidationError extends Error {
  readonly errors: DataError[];

  constructor(errors: DataError[]) {
    super(`${errors.length} data validation error(s)`);
    this.name = "DataValidationError";
    this.errors = errors;
  }
}

/**
 * Thrown by `loadBundle()` when the payload's recomputed SHA-256 hash does
 * not match the bundle's stored `hash` (bundle spec: "loadBundle() verifies
 * on read"). Carries both values so a caller can report them without
 * re-hashing.
 */
export class BundleHashMismatchError extends Error {
  readonly expected: string;
  readonly actual: string;

  constructor(expected: string, actual: string) {
    super(`bundle hash mismatch: expected ${expected}, got ${actual}`);
    this.name = "BundleHashMismatchError";
    this.expected = expected;
    this.actual = actual;
  }
}

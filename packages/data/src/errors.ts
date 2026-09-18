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
 * Thrown by `loadBundle()` when the bundle file's contents are not valid
 * JSON at all. Distinct from {@link BundleShapeError} (valid JSON, but not
 * shaped like a bundle) and from {@link BundleHashMismatchError} (a
 * well-shaped bundle whose hash does not match) — three different failures
 * a caller may want to handle differently (T11.4).
 */
export class BundleParseError extends Error {
  readonly file: string;

  constructor(file: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`bundle file "${file}" is not valid JSON: ${causeMessage}`, { cause });
    this.name = "BundleParseError";
    this.file = file;
  }
}

/**
 * Thrown by `loadBundle()` when the parsed JSON is not shaped like a
 * bundle: a missing `payload`, a missing `hash`, or either field with the
 * wrong type. Distinct from {@link BundleHashMismatchError}, which means
 * the shape was fine but the recomputed hash did not match (T11.4).
 */
export class BundleShapeError extends Error {
  readonly file: string;
  readonly reason: string;

  constructor(file: string, reason: string) {
    super(`bundle file "${file}" is not shaped like a bundle: ${reason}`);
    this.name = "BundleShapeError";
    this.file = file;
    this.reason = reason;
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

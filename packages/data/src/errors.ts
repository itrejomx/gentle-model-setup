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

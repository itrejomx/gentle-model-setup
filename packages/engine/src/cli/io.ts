/** CLI exit codes: `0` success, `1` invalid input, `2` usage or I/O error (AGENTS.md). */
export const EXIT_OK = 0;
export const EXIT_INVALID = 1;
export const EXIT_USAGE = 2;
export const EXIT_IO_ERROR = 2;

/** The streams a CLI writes to: just `write`, so tests pass plain objects. */
export interface CliStreams {
  stdout: Pick<NodeJS.WritableStream, "write">;
  stderr: Pick<NodeJS.WritableStream, "write">;
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Wires `process` to a CLI core: the only place in the engine that touches
 * `process.argv`, `process.stdout`/`stderr`, or `process.exitCode`. An
 * unexpected throw exits `2`, never Node's default `1`, which means invalid
 * input here.
 */
export function runEntry(run: (args: string[], streams: CliStreams) => Promise<number>): void {
  const streams: CliStreams = { stdout: process.stdout, stderr: process.stderr };
  run(process.argv.slice(2), streams)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((cause: unknown) => {
      process.stderr.write(`error: ${errorMessage(cause)}\n`);
      process.exitCode = EXIT_IO_ERROR;
    });
}

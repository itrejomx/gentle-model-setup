import { statSync } from "node:fs";
import { errorMessage } from "../errors.js";
import type { DataError } from "../errors.js";

/** Exit codes per design.md's CLI contract: `0` success, `1` data invalid
 * (includes a YAML parse failure and, for `build`, a cross-file integrity
 * failure), `2` usage or I/O error (AGENTS.md). `EXIT_USAGE` and
 * `EXIT_IO_ERROR` are two names for that same exit-`2` bucket -- design.md's
 * CLI table has no separate code for either -- split so a call site names
 * which kind of exit-`2` failure it is: `EXIT_USAGE` for a malformed
 * argument list, `EXIT_IO_ERROR` for everything else (a missing or
 * unreadable data root, a failed output write, an unexpected throw). Before
 * the split, every one of those sites read `return EXIT_USAGE`, which misled
 * a reader at, for example, a failed output write into thinking it was an
 * argument problem (issue #35: R2-exit-usage-name-overloaded). */
export const EXIT_OK = 0;
export const EXIT_INVALID = 1;
export const EXIT_USAGE = 2;
export const EXIT_IO_ERROR = 2;

/** The default data root both CLIs load from when no positional argument is
 * given, matching design.md's CLI table (`validateData('data')`). */
export const DEFAULT_DATA_ROOT = "data";

/**
 * Minimal stream shape the CLIs write to: just `write`, so tests can pass a
 * plain object instead of a real `NodeJS.WritableStream` (T10.6: "args,
 * streams in; exit code out", so tests never spawn a process).
 */
export interface CliStreams {
  stdout: Pick<NodeJS.WritableStream, "write">;
  stderr: Pick<NodeJS.WritableStream, "write">;
}

export type RootDirCheck = { ok: true } | { ok: false; message: string };

/**
 * Resolves the "usage or environment failure" exit-2 cases up front: a
 * missing data root, an unreadable one, or one that is not a directory.
 * Never touches a shell -- `path` is used only as a literal argument to
 * `node:fs`'s `statSync`, so a value containing shell metacharacters (the
 * threat matrix's space-and-`;` case) is read as that literal path, not
 * executed.
 */
export function checkRootDir(path: string): RootDirCheck {
  try {
    const stats = statSync(path);
    if (!stats.isDirectory()) {
      return { ok: false, message: `data root "${path}" is not a directory` };
    }
    return { ok: true };
  } catch (cause) {
    return {
      ok: false,
      message: `cannot read data root "${path}": ${errorMessage(cause)}`,
    };
  }
}

function sortDataErrors(errors: DataError[]): DataError[] {
  return [...errors].sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    if (a.field !== b.field) return a.field < b.field ? -1 : 1;
    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return 0;
  });
}

/**
 * Writes every error as `<file>:<field>: <message>` to `stderr`, sorted by
 * file, then field, then message, followed by a `N error(s) in M file(s)` summary
 * (design.md's CLI table). Shared by both CLIs so `validate` and `build`
 * report an invalid `DataSet` identically.
 */
export function writeDataErrors(streams: CliStreams, errors: DataError[]): void {
  const sorted = sortDataErrors(errors);
  for (const error of sorted) {
    streams.stderr.write(`${error.file}:${error.field}: ${error.message}\n`);
  }
  const fileCount = new Set(sorted.map((error) => error.file)).size;
  streams.stderr.write(`${sorted.length} error(s) in ${fileCount} file(s)\n`);
}

/**
 * Runs a CLI core and keeps the exit-code contract when it throws: an
 * unexpected failure is reported on `stderr` and exits `2`. Left unhandled,
 * Node would exit `1` with a stack trace, which is the code reserved for
 * invalid data.
 */
export async function runGuarded(
  run: (args: string[], streams: CliStreams) => Promise<number>,
  args: string[],
  streams: CliStreams,
): Promise<number> {
  try {
    return await run(args, streams);
  } catch (cause) {
    streams.stderr.write(`error: ${errorMessage(cause)}\n`);
    return EXIT_IO_ERROR;
  }
}

/**
 * Wires `process` to a CLI core: the only place in this package that
 * touches `process.argv`, `process.stdout`/`stderr`, or `process.exitCode`,
 * shared by `bin/validate.ts` and `bin/build.ts` so each entry file is a
 * one-line, always-run call (AGENTS.md: "the entrypoint only wires
 * `process` to it"). Unlike the deleted `import.meta.url` guard this
 * replaces, it has no condition to get wrong (issue #33).
 *
 * The trailing `.catch` covers `runGuarded` itself rejecting -- for example
 * `streams.stderr.write` throwing inside `runGuarded`'s own catch path (an
 * `EPIPE` when the consumer closed the pipe). Without it, that rejection
 * went unhandled and Node exited `1` with a stack trace, the code reserved
 * for invalid data, instead of the `2` this reports (issue #35, from the
 * follow-up comment).
 */
export function runEntry(run: (args: string[], streams: CliStreams) => Promise<number>): void {
  runGuarded(run, process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  })
    .then((code) => {
      process.exitCode = code;
    })
    .catch((cause: unknown) => {
      process.stderr.write(`error: ${errorMessage(cause)}\n`);
      process.exitCode = EXIT_IO_ERROR;
    });
}

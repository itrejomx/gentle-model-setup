import { pathToFileURL } from "node:url";
import { validateData } from "../load-data.js";
import {
  checkRootDir,
  DEFAULT_DATA_ROOT,
  EXIT_INVALID,
  EXIT_OK,
  EXIT_USAGE,
  runGuarded,
  writeDataErrors,
} from "./io.js";
import type { CliStreams } from "./io.js";

/**
 * Testable core of `pnpm validate` (design.md's CLI table): exactly one
 * optional positional argument, the data root, defaulting to `"data"`.
 * Never spawns a shell or subprocess -- `args[0]` is used only as a literal
 * filesystem path passed to `node:fs` calls -- so a value holding shell
 * metacharacters (a space, a `;`) can never be executed (threat matrix: CLI
 * argument composition). Args and streams in, exit code out, so tests never
 * spawn a process.
 */
export async function runValidateCli(args: string[], streams: CliStreams): Promise<number> {
  if (args.length > 1) {
    streams.stderr.write("usage: validate [path]\n");
    return EXIT_USAGE;
  }
  const rootDir = args[0] ?? DEFAULT_DATA_ROOT;

  const rootCheck = checkRootDir(rootDir);
  if (!rootCheck.ok) {
    streams.stderr.write(`error: ${rootCheck.message}\n`);
    return EXIT_USAGE;
  }

  const errors = await validateData(rootDir);
  if (errors.length === 0) {
    return EXIT_OK;
  }

  writeDataErrors(streams, errors);
  return EXIT_INVALID;
}

// Thin entrypoint: only runs when this file is executed directly (by
// `tsx`), never when a test imports `runValidateCli`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runGuarded(runValidateCli, process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  }).then((code) => {
    process.exitCode = code;
  });
}

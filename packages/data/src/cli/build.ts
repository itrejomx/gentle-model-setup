import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildBundle } from "../bundle.js";
import { DataValidationError } from "../errors.js";
import { loadData } from "../load-data.js";
import { writeFileAtomic } from "./atomic-write.js";
import type { AtomicWriteOps } from "./atomic-write.js";
import {
  checkRootDir,
  DEFAULT_DATA_ROOT,
  EXIT_INVALID,
  EXIT_OK,
  EXIT_USAGE,
  errorMessage,
  writeDataErrors,
} from "./io.js";
import type { CliStreams } from "./io.js";

/** design.md's CLI table: `pnpm build` writes `build/data.json`, gitignored
 * (repo `.gitignore` already ignores `build/` at any depth). Relative to
 * the CLI's working directory, matching `pnpm -r run build`'s per-package
 * cwd -- the same place `pnpm -r run test`/`typecheck` already operate. */
const DEFAULT_OUTPUT_PATH = join("build", "data.json");

/**
 * Testable core of `pnpm build` (design.md's CLI table): validates first,
 * then writes the hashed bundle and prints its hash to stdout. Up to two
 * optional positional arguments -- the data root (default `"data"`) and the
 * output file path (default `"build/data.json"`, overridable so tests never
 * write into the real build directory) -- both used only as literal
 * filesystem paths, never interpolated into a shell (threat matrix: CLI
 * argument composition). Args and streams in, exit code out.
 */
export async function runBuildCli(
  args: string[],
  streams: CliStreams,
  ops?: AtomicWriteOps,
): Promise<number> {
  if (args.length > 2) {
    streams.stderr.write("usage: build [dataRoot] [outputPath]\n");
    return EXIT_USAGE;
  }
  const rootDir = args[0] ?? DEFAULT_DATA_ROOT;
  const outputPath = args[1] ?? DEFAULT_OUTPUT_PATH;

  const rootCheck = checkRootDir(rootDir);
  if (!rootCheck.ok) {
    streams.stderr.write(`error: ${rootCheck.message}\n`);
    return EXIT_USAGE;
  }

  // Nothing is written on a non-zero exit (design.md's CLI contract): both
  // `loadData` (schema validation) and `buildBundle` (cross-file integrity)
  // throw the same `DataValidationError` before any file write is reached.
  let bundle: ReturnType<typeof buildBundle>;
  try {
    bundle = buildBundle(await loadData(rootDir));
  } catch (cause) {
    if (cause instanceof DataValidationError) {
      writeDataErrors(streams, cause.errors);
      return EXIT_INVALID;
    }
    throw cause;
  }

  // A failed write (the output path is a directory, its parent is a file,
  // the location is read-only) is an I/O error: exit 2, never a raw `fs`
  // error that Node would report as exit 1. Written atomically (issue #34):
  // a write or rename that fails partway leaves any pre-existing bundle at
  // `outputPath` byte-identical, instead of a truncated `data.json`.
  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileAtomic(outputPath, JSON.stringify(bundle, null, 2) + "\n", ops);
  } catch (cause) {
    streams.stderr.write(`error: cannot write "${outputPath}": ${errorMessage(cause)}\n`);
    return EXIT_USAGE;
  }

  streams.stdout.write(`${bundle.hash}\n`);
  return EXIT_OK;
}

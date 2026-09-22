import { randomUUID } from "node:crypto";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * The `node:fs` operations {@link writeFileAtomic} uses, as an injectable
 * seam: real filesystem behavior by default, swapped out only in tests,
 * where a partial write followed by a failure cannot be forced through the
 * real filesystem deterministically. A fake is acceptable only at this
 * boundary -- no module mocking, no mocking of internal collaborators
 * (issue #34).
 */
export interface AtomicWriteOps {
  writeFileSync: (path: string, data: string, encoding: "utf8") => void;
  renameSync: (oldPath: string, newPath: string) => void;
  rmSync: (path: string, options: { force: boolean }) => void;
}

const defaultAtomicWriteOps: AtomicWriteOps = { writeFileSync, renameSync, rmSync };

/**
 * Writes `content` to `path` atomically: writes it to a temporary sibling
 * file in `path`'s own directory (so the rename that follows stays on one
 * filesystem), then renames that file over `path`. A write or rename
 * failure removes the temporary file, on a best-effort basis (a cleanup
 * failure never replaces the original error), and rethrows -- any
 * pre-existing file at `path` is left byte-identical (issue #34).
 *
 * The temporary name carries this process's pid and a random UUID so two
 * concurrent builds of the same output path never collide; it is never
 * part of the bundle, so the determinism rules that govern the bundle hash
 * (AGENTS.md) do not apply to it.
 */
export function writeFileAtomic(
  path: string,
  content: string,
  ops: AtomicWriteOps = defaultAtomicWriteOps,
): void {
  const tempPath = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    ops.writeFileSync(tempPath, content, "utf8");
    ops.renameSync(tempPath, path);
  } catch (cause) {
    try {
      ops.rmSync(tempPath, { force: true });
    } catch {
      // Best effort: the write/rename failure above is what the caller
      // reports, and a cleanup failure must never mask it.
    }
    throw cause;
  }
}

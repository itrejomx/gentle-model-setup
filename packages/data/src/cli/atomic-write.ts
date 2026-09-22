import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * The `node:fs` operations {@link writeFileAtomic} uses, as an injectable
 * seam: real filesystem behavior by default, swapped out only in tests,
 * where a partial write followed by a failure cannot be forced through the
 * real filesystem deterministically. A fake is acceptable only at this
 * boundary -- no module mocking, no mocking of internal collaborators
 * (issue #34).
 *
 * `fsyncSync` takes a path rather than an open file descriptor (issue #35,
 * from #38): the default implementation opens its own descriptor on the
 * already-written temporary file, `fsyncSync`s it, and closes it, rather
 * than growing this interface to the lower-level `openSync`/`writeSync`/
 * `fsyncSync`/`closeSync` quartet in place of `writeFileSync`. `fsync`
 * forces the kernel to flush a file's dirty pages regardless of which
 * descriptor wrote them, so this is exactly as durable and keeps the seam
 * to one new method instead of replacing `writeFileSync` (and the tests
 * built on it) outright.
 */
export interface AtomicWriteOps {
  writeFileSync: (path: string, data: string, encoding: "utf8") => void;
  fsyncSync: (path: string) => void;
  renameSync: (oldPath: string, newPath: string) => void;
  rmSync: (path: string, options: { force: boolean }) => void;
}

function fsyncSyncByPath(path: string): void {
  const fd = openSync(path, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

const defaultAtomicWriteOps: AtomicWriteOps = {
  writeFileSync,
  fsyncSync: fsyncSyncByPath,
  renameSync,
  rmSync,
};

/**
 * Writes `content` to `path` atomically: writes it to a temporary sibling
 * file in `path`'s own directory (so the rename that follows stays on one
 * filesystem), `fsync`s that file, then renames it over `path`. A write,
 * fsync, or rename failure removes the temporary file, on a best-effort
 * basis (a cleanup failure never replaces the original error), and
 * rethrows -- any pre-existing file at `path` is left byte-identical
 * (issue #34).
 *
 * The `fsync` before the rename (issue #35, from #38) closes the crash
 * boundary a write-then-rename alone leaves open: without it, the write is
 * atomic against an in-process failure, but the temporary file's data could
 * still be sitting unflushed in the page cache when an OS crash lands
 * between the rename and whenever the kernel would otherwise have flushed
 * it, leaving a bundle at `path` with a valid rename but truncated content.
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
    ops.fsyncSync(tempPath);
    ops.renameSync(tempPath, path);
  } catch (cause) {
    try {
      ops.rmSync(tempPath, { force: true });
    } catch {
      // Best effort: the write/fsync/rename failure above is what the
      // caller reports, and a cleanup failure must never mask it.
    }
    throw cause;
  }
}

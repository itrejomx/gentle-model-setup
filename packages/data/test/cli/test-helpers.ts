import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Shared by `build.test.ts`, `validate.test.ts`, and `entry-symlink.test.ts`,
 * which each duplicated their own copy of stream capture, temp-dir creation,
 * and the minimal valid-phases fixture (issue #35: R2-cli-test-helpers-
 * duplicated).
 */
export interface CapturedStreams {
  streams: {
    stdout: { write: (chunk: string) => boolean };
    stderr: { write: (chunk: string) => boolean };
  };
  out: string[];
  err: string[];
}

/** Captures everything written to `stdout`/`stderr` into plain arrays, so a
 * CLI core (which takes `CliStreams` rather than real `process` streams) can
 * be asserted on without spawning a process. */
export function captureStreams(): CapturedStreams {
  const out: string[] = [];
  const err: string[] = [];
  return {
    streams: {
      stdout: {
        write: (chunk: string) => {
          out.push(chunk);
          return true;
        },
      },
      stderr: {
        write: (chunk: string) => {
          err.push(chunk);
          return true;
        },
      },
    },
    out,
    err,
  };
}

/**
 * A fresh temp directory under `<prefix><random>`, pushed onto `cleanupDirs`
 * for the caller's own `afterEach` to remove (each test file keeps its own
 * `cleanupDirs` array and `afterEach`, since Vitest test files do not share
 * module state).
 */
export function makeTempRoot(cleanupDirs: string[], prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanupDirs.push(dir);
  return dir;
}

/** Minimal valid `phases/phases.yaml` -- the only collection whose file must
 * exist for `validateData`/`loadData` to report zero errors (every other
 * collection tolerates a missing directory as "zero rows"). */
export function writeValidPhasesFixture(rootDir: string): void {
  mkdirSync(join(rootDir, "phases"), { recursive: true });
  writeFileSync(
    join(rootDir, "phases", "phases.yaml"),
    [
      "phases:",
      "  - id: fixture-phase",
      "    group: workers",
      "    callPattern: one-shot",
      "    role: neutral",
      "    weights: { oneShotReasoning: 1, sustainedReasoning: 0, codingTools: 0, longContext: 0, multimodal: 0, cheap: 0 }",
      "",
    ].join("\n"),
    "utf8",
  );
}

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { makeTempRoot, writeValidPhasesFixture } from "./test-helpers.js";

// AGENTS.md bans `child_process` across `packages/data`; the enforcement
// mechanism (`no-child-process.test.ts`) scans only `src`, so this file --
// under `test/` -- is the one place that may import it. It spawns the CLI
// as a real process because the bug it reproduces (issue #33) lives in the
// comparison between `process.argv[1]` and `import.meta.url`, which an
// in-process call to `runValidateCli` or `runBuildCli` never exercises.

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, "../..");
const tsxBin = join(packageDir, "node_modules", ".bin", "tsx");

const cleanupDirs: string[] = [];

afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Symlinks `packageDir` inside a fresh temp directory and returns the path
 * to `entryRelativePath` reached through that symlink -- reproducing issue
 * #33: `process.argv[1]` keeps the symlinked path while `import.meta.url`
 * resolves to the real one, so a guard comparing the two is false and the
 * entry never runs.
 */
function symlinkedEntryPath(entryRelativePath: string): string {
  const tmpParent = mkdtempSync(join(tmpdir(), "gentle-ai-cli-entry-"));
  cleanupDirs.push(tmpParent);
  const linkPath = join(tmpParent, "pkg");
  symlinkSync(packageDir, linkPath, "dir");
  return join(linkPath, entryRelativePath);
}

describe("CLI entry through a symlinked path (issue #33)", () => {
  it("validate exits 2 and reports the missing data root, never exit 0 silently", () => {
    const entry = symlinkedEntryPath("src/bin/validate.ts");

    // `cwd` is the real `packages/data` directory, not the symlink: `tsx`
    // can fail with EINVAL (UNIX socket path too long) when its working
    // directory is a very long path, and the symlink target here is under
    // a deep repository checkout.
    const result = spawnSync(tsxBin, [entry, "/definitely/missing"], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    // Checked before the status assertion (issue #35, from the follow-up
    // comment): without it, a missing `tsx` shim or the 15 s timeout makes
    // `result.status` come back `null`, which reads as "expected null to be
    // 2" -- indistinguishable from an actual regression.
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("cannot read data root");
  });

  it("build exits 2 and reports the missing data root, never exit 0 silently", () => {
    const entry = symlinkedEntryPath("src/bin/build.ts");

    const result = spawnSync(tsxBin, [entry, "/definitely/missing"], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("cannot read data root");
  });
});

// Issue #35 (from the follow-up comment): both spawn tests above assert the
// same usage-failure path, so wiring the wrong core into an entry file (for
// example `bin/validate.ts` calling `runBuildCli`) would not fail either of
// them. One success-path case per entry, each asserting the one thing only
// that entry's own core prints, closes that gap.
describe("CLI entry success path distinguishes the two cores (issue #35)", () => {
  it("validate prints nothing to stdout for a valid data root", () => {
    const entry = symlinkedEntryPath("src/bin/validate.ts");
    const dataRoot = makeTempRoot(cleanupDirs, "gentle-ai-cli-entry-data-");
    writeValidPhasesFixture(dataRoot);

    const result = spawnSync(tsxBin, [entry, dataRoot], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("build prints a 64-hex bundle hash to stdout for a valid data root", () => {
    const entry = symlinkedEntryPath("src/bin/build.ts");
    const dataRoot = makeTempRoot(cleanupDirs, "gentle-ai-cli-entry-data-");
    writeValidPhasesFixture(dataRoot);
    const outputPath = join(dataRoot, "out.json");

    const result = spawnSync(tsxBin, [entry, dataRoot, outputPath], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^[0-9a-f]{64}\n$/);
  });
});

// Issue #35 (from the follow-up comment): the deleted `cli/validate.ts` and
// `cli/build.ts` module paths defined `runValidateCli`/`runBuildCli` but
// called neither -- running either path directly with `tsx` loaded the
// module, ran nothing, and exited 0, the same silent-success shape #33
// removed from the entry files themselves. Renaming the command modules
// (T5) makes the old paths fail loudly: there is no module there to load.
describe("old CLI module paths no longer exist (issue #35)", () => {
  it("the old cli/validate.ts path fails to resolve, never exits 0 silently", () => {
    const oldPath = join(packageDir, "src", "cli", "validate.ts");

    const result = spawnSync(tsxBin, [oldPath, "/definitely/missing"], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
  });

  it("the old cli/build.ts path fails to resolve, never exits 0 silently", () => {
    const oldPath = join(packageDir, "src", "cli", "build.ts");

    const result = spawnSync(tsxBin, [oldPath, "/definitely/missing"], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
  });
});

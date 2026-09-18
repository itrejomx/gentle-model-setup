import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

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

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("cannot read data root");
  });
});

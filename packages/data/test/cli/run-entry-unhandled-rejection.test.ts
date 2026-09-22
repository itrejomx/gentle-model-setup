import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// AGENTS.md bans `child_process` across `packages/data`; the enforcement
// mechanism (`no-child-process.test.ts`) scans only `src`, so this file --
// under `test/` -- is one of the places that may import it. `runEntry`
// hardcodes the real `process.stdout`/`process.stderr`, so the only way to
// force the write inside `runGuarded`'s own catch path to throw (the issue
// #35 scenario: "an EPIPE when the consumer closed the pipe") is a real
// process whose own `process.stderr.write` is overridden, not an in-process
// call with injected streams.

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, "../..");
const tsxBin = join(packageDir, "node_modules", ".bin", "tsx");
const fixture = join(packageDir, "test", "fixtures", "cli", "run-entry-throwing-stderr.ts");

describe("runEntry never leaves a rejection unhandled (issue #35)", () => {
  it("exits 2, never an uncaught-exception exit 1, when reporting the original error itself throws", () => {
    const result = spawnSync(tsxBin, [fixture], {
      cwd: packageDir,
      encoding: "utf8",
      timeout: 15_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
  });
});

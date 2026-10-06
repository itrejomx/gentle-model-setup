import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AtomicWriteOps } from "../../src/cli/atomic-write.js";
import { runBuildCli } from "../../src/cli/build-command.js";
import { loadBundle } from "../../src/index.js";
import {
  captureStreams,
  makeTempRoot as makeTempRootIn,
  writeValidPhasesFixture,
} from "./test-helpers.js";

const cleanupDirs: string[] = [];

afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempRoot(): string {
  return makeTempRootIn(cleanupDirs, "gentle-ai-build-cli-");
}

/** Real `fsyncSync`, by path rather than an already-open file descriptor --
 * matches the shape `AtomicWriteOps.fsyncSync` needs (issue #35, from #38). */
function fsyncSyncByPath(path: string): void {
  const fd = openSync(path, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

describe("runBuildCli threat matrix: CLI argument composition", () => {
  it("treats a path argument containing a space and a semicolon as a literal directory, never executing it", async () => {
    const rootDir = makeTempRoot();
    const weirdDir = join(rootDir, "some dir; rm -rf /");
    mkdirSync(weirdDir, { recursive: true });
    writeValidPhasesFixture(weirdDir);
    const outputPath = join(rootDir, "out.json");

    const { streams, err } = captureStreams();
    const code = await runBuildCli([weirdDir, outputPath], streams);

    expect(code).toBe(0);
    expect(err.join("")).toBe("");
    expect(existsSync(outputPath)).toBe(true);
  });
});

describe("runBuildCli exit codes", () => {
  it("exits 0, writes the bundle, and prints the hash to stdout for a valid data root", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    const outputPath = join(rootDir, "build", "data.json");

    const { streams, out, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams);

    expect(code).toBe(0);
    expect(err.join("")).toBe("");
    const stdout = out.join("");
    expect(stdout).toMatch(/^[0-9a-f]{64}\n$/);

    // Reads the written file back through loadBundle, which re-hashes the
    // payload it finds on disk: proves data.json is a loadable bundle whose
    // stored hash matches its own content, not merely that the in-memory
    // object printed to stdout and the in-memory object written to disk
    // agree with each other (issue #34).
    const loaded = await loadBundle(outputPath);
    expect(loaded.hash).toBe(stdout.trim());
  });

  it("exits 1 and writes nothing for invalid data", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    mkdirSync(join(rootDir, "subscriptions"), { recursive: true });
    writeFileSync(join(rootDir, "subscriptions", "bad.yaml"), "id: 123\n", "utf8");
    const outputPath = join(rootDir, "build", "data.json");

    const { streams, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams);

    expect(code).toBe(1);
    expect(err.join("")).toMatch(/error\(s\) in \d+ file\(s\)/);
    expect(existsSync(outputPath)).toBe(false);
  });

  // Issue #32: on `main`, this same fixture made `build` exit 2 with a bare
  // `Error` message from `deriveBudgetClass`, naming no file and no field.
  it("exits 1 and writes nothing, naming the file and budgetClass.thresholds, for a malformed threshold list", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    mkdirSync(join(rootDir, "subscriptions"), { recursive: true });
    writeFileSync(
      join(rootDir, "subscriptions", "bad-thresholds.yaml"),
      [
        "id: bad-sub",
        "displayName: Bad Subscription",
        "providerPrefix: bad",
        "billingModel: capped",
        "budgetClass:",
        "  derivedFrom: requestsPer5h",
        "  thresholds:",
        "    - { class: volume, max: 9000 }",
        "plans:",
        "  - { id: go, displayName: Go, priceUsdPerMonth: 10 }",
        "catalogSourceUrl: https://example.com/catalog",
        "verifiedAt: 2026-09-14",
        "",
      ].join("\n"),
      "utf8",
    );
    const outputPath = join(rootDir, "build", "data.json");

    const { streams, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams);
    const stderr = err.join("");

    expect(code).toBe(1);
    expect(stderr).toContain("bad-thresholds.yaml:budgetClass.thresholds:");
    expect(existsSync(outputPath)).toBe(false);
  });

  // Issue #35: "no CLI test feeds malformed YAML to validate or build" --
  // both exit 1 today, pinned here. Also proves the single-line message
  // format (T2) survives the full loader/CLI pipeline for build, not just
  // for validate.
  it("exits 1 and writes nothing, with a single-line message, for malformed YAML", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    mkdirSync(join(rootDir, "subscriptions"), { recursive: true });
    writeFileSync(join(rootDir, "subscriptions", "malformed.yaml"), "id: [unclosed\n", "utf8");
    const outputPath = join(rootDir, "build", "data.json");

    const { streams, out, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams);
    const lines = err.join("").split("\n").filter((line) => line.length > 0);

    expect(code).toBe(1);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/malformed\.yaml:<document>: failed to parse YAML: .+/);
    expect(lines[1]).toBe("1 error(s) in 1 file(s)");
    expect(out.join("")).toBe("");
    expect(existsSync(outputPath)).toBe(false);
  });

  it("exits 2 and writes nothing when the data root does not exist", async () => {
    const rootDir = makeTempRoot();
    const missingRoot = join(rootDir, "does-not-exist");
    const outputPath = join(rootDir, "build", "data.json");

    const { streams, err } = captureStreams();
    const code = await runBuildCli([missingRoot, outputPath], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/cannot read data root/);
    expect(existsSync(outputPath)).toBe(false);
  });

  it("exits 2 with a message, never a raw fs error, when the output path cannot be written", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    // An existing directory where the bundle file should go: EISDIR on write.
    const outputPath = join(rootDir, "out");
    mkdirSync(outputPath);

    const { streams, out, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/^error: cannot write ".*out": /);
    expect(out.join("")).toBe("");
  });

  it("exits 2 for more than two positional arguments (usage error)", async () => {
    const { streams, err } = captureStreams();
    const code = await runBuildCli(["a", "b", "c"], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/usage/i);
  });
});

describe("runBuildCli atomic write (issue #34)", () => {
  it("leaves an existing good output file byte-identical, exits 2, and leaves no temporary file, when the write fails partway", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    const outputDir = join(rootDir, "build");
    mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, "data.json");
    const originalContent = '{"hash":"existing-good-bundle"}';
    writeFileSync(outputPath, originalContent, "utf8");

    // Simulates a disk-full/I-O failure partway through the write: the real
    // filesystem cannot be forced to fail mid-write deterministically, so
    // this fakes only the injected `writeFileSync` boundary (no module
    // mocking, no mocking of internal collaborators).
    const partialWriteOps: AtomicWriteOps = {
      writeFileSync: (path, data, encoding) => {
        writeFileSync(path, data.slice(0, Math.floor(data.length / 2)), encoding);
        throw new Error("simulated disk full");
      },
      // Never reached: the write above throws first, before fsync. Present
      // only because the interface requires it.
      fsyncSync: () => {},
      renameSync,
      rmSync,
    };

    const { streams, out, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams, partialWriteOps);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/^error: cannot write ".*data\.json": simulated disk full/);
    expect(out.join("")).toBe("");
    expect(readFileSync(outputPath, "utf8")).toBe(originalContent);
    expect(readdirSync(outputDir)).toEqual(["data.json"]);
  });

  it("leaves an existing good output file byte-identical, exits 2, and leaves no temporary file, when the rename fails", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    const outputDir = join(rootDir, "build");
    mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, "data.json");
    const originalContent = '{"hash":"existing-good-bundle"}';
    writeFileSync(outputPath, originalContent, "utf8");

    const failingRenameOps: AtomicWriteOps = {
      writeFileSync,
      fsyncSync: fsyncSyncByPath,
      renameSync: () => {
        throw new Error("simulated rename failure");
      },
      rmSync,
    };

    const { streams, out, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams, failingRenameOps);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/^error: cannot write ".*data\.json": simulated rename failure/);
    expect(out.join("")).toBe("");
    expect(readFileSync(outputPath, "utf8")).toBe(originalContent);
    expect(readdirSync(outputDir)).toEqual(["data.json"]);
  });

  // Issue #35 (from #38): without an `fsync` before the rename, the write is
  // atomic against in-process failures but not against an OS crash between
  // the write and the rename -- the temporary file's data could still be
  // sitting in the page cache, unflushed, when the rename makes it visible
  // at the destination path. Recording call order (rather than asserting on
  // real crash behavior, which cannot be forced deterministically) proves
  // the fsync happens, and happens before the rename.
  it("fsyncs the temporary file before renaming it over the destination", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    const outputPath = join(rootDir, "build", "data.json");

    const callOrder: string[] = [];
    const trackingOps: AtomicWriteOps = {
      writeFileSync: (path, data, encoding) => {
        callOrder.push("write");
        writeFileSync(path, data, encoding);
      },
      fsyncSync: (path) => {
        callOrder.push("fsync");
        fsyncSyncByPath(path);
      },
      renameSync: (oldPath, newPath) => {
        callOrder.push("rename");
        renameSync(oldPath, newPath);
      },
      rmSync,
    };

    const { streams } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams, trackingOps);

    expect(code).toBe(0);
    expect(callOrder).toEqual(["write", "fsync", "rename"]);
  });

  // Issue #35 (from #38): the cleanup `rmSync` next to a failing write is
  // itself wrapped in a try/catch so its own failure never masks the
  // original error -- untested until now.
  it("reports the original write error, not a masking cleanup failure, when the cleanup rmSync also throws", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    const outputPath = join(rootDir, "build", "data.json");

    const failingCleanupOps: AtomicWriteOps = {
      writeFileSync: () => {
        throw new Error("simulated disk full");
      },
      fsyncSync: fsyncSyncByPath,
      renameSync,
      rmSync: () => {
        throw new Error("simulated cleanup failure");
      },
    };

    const { streams, out, err } = captureStreams();
    const code = await runBuildCli([rootDir, outputPath], streams, failingCleanupOps);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/^error: cannot write ".*data\.json": simulated disk full/);
    expect(out.join("")).toBe("");
  });
});

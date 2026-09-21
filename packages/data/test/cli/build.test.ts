import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AtomicWriteOps } from "../../src/cli/atomic-write.js";
import { runBuildCli } from "../../src/cli/build.js";

interface CapturedStreams {
  streams: { stdout: { write: (chunk: string) => boolean }; stderr: { write: (chunk: string) => boolean } };
  out: string[];
  err: string[];
}

function captureStreams(): CapturedStreams {
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

const cleanupDirs: string[] = [];

afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "gentle-ai-build-cli-"));
  cleanupDirs.push(dir);
  return dir;
}

/** Same minimal valid fixture used by the validate CLI tests: only
 * `phases/phases.yaml` needs to exist for a zero-error DataSet. */
function writeValidPhasesFixture(rootDir: string): void {
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

    const written = JSON.parse(readFileSync(outputPath, "utf8")) as { hash: string; payload: unknown };
    expect(written.hash).toBe(stdout.trim());
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
});

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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

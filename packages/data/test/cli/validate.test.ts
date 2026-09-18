import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runValidateCli } from "../../src/cli/validate.js";

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
  const dir = mkdtempSync(join(tmpdir(), "gentle-ai-validate-cli-"));
  cleanupDirs.push(dir);
  return dir;
}

/** Minimal valid `phases/phases.yaml` -- the only collection whose file must
 * exist for `validateData` to report zero errors (every other collection
 * tolerates a missing directory as "zero rows"). */
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

describe("runValidateCli threat matrix: CLI argument composition", () => {
  it("treats a path argument containing a space and a semicolon as a literal directory, never executing it", async () => {
    const rootDir = makeTempRoot();
    const weirdDir = join(rootDir, "some dir; rm -rf /");
    mkdirSync(weirdDir, { recursive: true });
    writeValidPhasesFixture(weirdDir);

    const { streams, err } = captureStreams();
    const code = await runValidateCli([weirdDir], streams);

    expect(code).toBe(0);
    expect(err.join("")).toBe("");
  });

  it("exits 2 when a path argument with shell metacharacters does not exist, never executing it", async () => {
    const rootDir = makeTempRoot();
    const weirdPath = join(rootDir, "missing dir; rm -rf /");

    const { streams, err } = captureStreams();
    const code = await runValidateCli([weirdPath], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/cannot read data root/);
  });
});

describe("runValidateCli exit codes", () => {
  it("exits 0 and writes nothing for a valid data root", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);

    const { streams, out, err } = captureStreams();
    const code = await runValidateCli([rootDir], streams);

    expect(code).toBe(0);
    expect(out.join("")).toBe("");
    expect(err.join("")).toBe("");
  });

  it("exits 1, printing file:field: message per error sorted by file then a summary line, for invalid data", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    mkdirSync(join(rootDir, "subscriptions"), { recursive: true });
    // Wrong type for `id` in two files, named so alphabetical file order is
    // predictable.
    writeFileSync(join(rootDir, "subscriptions", "aaa-bad.yaml"), "id: 123\n", "utf8");
    writeFileSync(join(rootDir, "subscriptions", "zzz-bad.yaml"), "id: []\n", "utf8");

    const { streams, err } = captureStreams();
    const code = await runValidateCli([rootDir], streams);
    const stderr = err.join("");

    expect(code).toBe(1);
    const aaaIndex = stderr.indexOf("aaa-bad.yaml");
    const zzzIndex = stderr.indexOf("zzz-bad.yaml");
    expect(aaaIndex).toBeGreaterThanOrEqual(0);
    expect(zzzIndex).toBeGreaterThan(aaaIndex);
    expect(stderr).toMatch(/^\d+ error\(s\) in 2 file\(s\)\n?$/m);
  });

  it("exits 2 when the data root does not exist", async () => {
    const rootDir = makeTempRoot();
    const missingRoot = join(rootDir, "does-not-exist");

    const { streams, err } = captureStreams();
    const code = await runValidateCli([missingRoot], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/cannot read data root/);
  });

  it("exits 2 when the data root is not a directory", async () => {
    const rootDir = makeTempRoot();
    const filePath = join(rootDir, "not-a-dir");
    writeFileSync(filePath, "content", "utf8");

    const { streams, err } = captureStreams();
    const code = await runValidateCli([filePath], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/not a directory/);
  });

  // Issue #32: a Subscription whose threshold list is malformed (here, the
  // last entry's max is not null) is a data error at the door, not a lazy
  // throw the first time `deriveBudgetClass` reaches it.
  it("exits 1, naming the file and budgetClass.thresholds, for a malformed threshold list", async () => {
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

    const { streams, err } = captureStreams();
    const code = await runValidateCli([rootDir], streams);
    const stderr = err.join("");

    expect(code).toBe(1);
    expect(stderr).toContain("bad-thresholds.yaml:budgetClass.thresholds:");
  });

  it("exits 2 for more than one positional argument (usage error)", async () => {
    const { streams, err } = captureStreams();
    const code = await runValidateCli(["a", "b"], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/usage/i);
  });
});

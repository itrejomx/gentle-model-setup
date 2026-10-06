import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runValidateCli } from "../../src/cli/validate-command.js";
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
  return makeTempRootIn(cleanupDirs, "gentle-ai-validate-cli-");
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

  // Issue #35: "no CLI test feeds malformed YAML to validate or build" --
  // both exit 1 today, pinned here. Also proves the single-line message
  // format (T2) survives the full loader/CLI pipeline, not just the
  // yaml.ts unit tested directly in loader-containment.test.ts.
  it("exits 1, with a single-line message, for malformed YAML", async () => {
    const rootDir = makeTempRoot();
    writeValidPhasesFixture(rootDir);
    mkdirSync(join(rootDir, "subscriptions"), { recursive: true });
    writeFileSync(join(rootDir, "subscriptions", "malformed.yaml"), "id: [unclosed\n", "utf8");

    const { streams, err } = captureStreams();
    const code = await runValidateCli([rootDir], streams);
    // Non-empty lines: a data-error message can never itself contain "\n"
    // (T2), so one array entry per line proves that as a side effect.
    const lines = err.join("").split("\n").filter((line) => line.length > 0);

    expect(code).toBe(1);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/malformed\.yaml:<document>: failed to parse YAML: .+/);
    expect(lines[1]).toBe("1 error(s) in 1 file(s)");
  });

  it("exits 2 for more than one positional argument (usage error)", async () => {
    const { streams, err } = captureStreams();
    const code = await runValidateCli(["a", "b"], streams);

    expect(code).toBe(2);
    expect(err.join("")).toMatch(/usage/i);
  });
});

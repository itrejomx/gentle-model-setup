import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readYamlFile } from "../src/yaml.js";

const cleanupDirs: string[] = [];

afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("readYamlFile containment (threat matrix: untrusted data parsing)", () => {
  it("loads a file that stays within the data root", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "data-root-"));
    cleanupDirs.push(rootDir);
    const filePath = join(rootDir, "ok.yaml");
    writeFileSync(filePath, "id: fine\n", "utf8");

    expect(readYamlFile(filePath, rootDir)).toEqual({ id: "fine" });
  });

  it("rejects a symlink that escapes the data root", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "data-root-"));
    const outsideDir = mkdtempSync(join(tmpdir(), "outside-"));
    cleanupDirs.push(rootDir, outsideDir);
    const outsideFile = join(outsideDir, "secret.yaml");
    writeFileSync(outsideFile, "id: leaked\n", "utf8");
    const symlinkPath = join(rootDir, "escape.yaml");
    symlinkSync(outsideFile, symlinkPath);

    expect(() => readYamlFile(symlinkPath, rootDir)).toThrow(/escapes/i);
  });
});

describe("readYamlFile alias-bomb guard (threat matrix: untrusted data parsing)", () => {
  it("rejects a committed alias-bomb fixture without hanging", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "data-root-"));
    cleanupDirs.push(rootDir);
    const filePath = join(rootDir, "alias-bomb.yaml");
    const aliasBomb = [
      "lvl0: &lvl0 [x, x, x, x, x]",
      "lvl1: &lvl1 [*lvl0, *lvl0, *lvl0, *lvl0, *lvl0]",
      "lvl2: &lvl2 [*lvl1, *lvl1, *lvl1, *lvl1, *lvl1]",
      "lvl3: &lvl3 [*lvl2, *lvl2, *lvl2, *lvl2, *lvl2]",
      "lvl4: [*lvl3, *lvl3, *lvl3, *lvl3, *lvl3]",
      "",
    ].join("\n");
    writeFileSync(filePath, aliasBomb, "utf8");

    expect(() => readYamlFile(filePath, rootDir)).toThrow(/alias/i);
  });
});

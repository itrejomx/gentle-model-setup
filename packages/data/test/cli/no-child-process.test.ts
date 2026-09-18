import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "../../src");

/**
 * Recurses `dir` and returns every `.ts` file under it. Mirrors the shape of
 * `listYamlFilesRecursive` in `load-data.ts`, but for source files instead
 * of data files.
 */
function listTsFilesRecursive(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFilesRecursive(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Threat matrix (CLI argument and subprocess composition): the design
 * response is "packages/data imports no child_process" -- the CLIs take one
 * positional path argument and never spawn a shell, so a path argument
 * holding shell metacharacters can never be executed. This scans every
 * source file rather than trusting a convention, so a future CLI cannot
 * reintroduce a subprocess call unnoticed.
 */
describe("packages/data/src imports no child_process (threat matrix: CLI argument composition)", () => {
  it("has no child_process import or require in any source file", () => {
    const offenders = listTsFilesRecursive(srcDir).filter((file) =>
      readFileSync(file, "utf8").includes("child_process"),
    );
    expect(offenders).toEqual([]);
  });
});

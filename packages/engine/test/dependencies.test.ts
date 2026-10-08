import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..");
const DATA_PACKAGE = "@gentle-ai/profile-data";

interface PackageManifest {
  name?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
}

function readManifest(): PackageManifest {
  return JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as PackageManifest;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}

/** The only directories under `src/` that may import the data package at runtime: the demo's. */
const RUNTIME_DIRECTORIES = ["cli", "bin"];

function isRuntimeFile(file: string): boolean {
  return RUNTIME_DIRECTORIES.some((directory) => file.startsWith(join(packageRoot, "src", directory) + sep));
}

/**
 * Every quoted mention of the specifier must belong to a type-only import.
 * That rules out value imports, `export ... from`, bare side-effect imports,
 * dynamic `import()`, and `require`. The type-only pattern is anchored to one
 * statement: no `;` and no second `import` or `export` keyword between
 * `import type` and `from`, so it holds with or without semicolons.
 */
function countImports(source: string): { mentions: number; typeOnly: number } {
  const mention = /["']@gentle-ai\/profile-data["']/g;
  const typeOnlyImport =
    /^\s*import type\b(?:(?!\b(?:import|export)\b)[^;])*?from\s+["']@gentle-ai\/profile-data["']/gms;
  return { mentions: source.match(mention)?.length ?? 0, typeOnly: source.match(typeOnlyImport)?.length ?? 0 };
}

describe("zero runtime dependencies", () => {
  it("declares no runtime dependency", () => {
    const manifest = readManifest();
    expect(manifest.name).toBe("@gentle-ai/profile-engine");
    expect(manifest.dependencies ?? {}).toEqual({});
  });

  it("lists the data package as a development dependency for its types", () => {
    const devDependencies = readManifest().devDependencies as Record<string, string>;
    expect(devDependencies[DATA_PACKAGE]).toBe("workspace:*");
  });

  it("references the data package only through `import type ... from`", () => {
    const files = sourceFiles(join(packageRoot, "src")).filter((file) => !isRuntimeFile(file));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const { mentions, typeOnly } = countImports(readFileSync(file, "utf8"));
      expect(mentions, file).toBe(typeOnly);
    }
  });

  it("keeps the engine core type-only: the data package's value imports live only in src/cli and src/bin", () => {
    const valueImporters = sourceFiles(join(packageRoot, "src")).filter((file) => {
      const { mentions, typeOnly } = countImports(readFileSync(file, "utf8"));
      return mentions !== typeOnly;
    });
    expect(valueImporters.length).toBeGreaterThan(0);
    for (const file of valueImporters) expect(isRuntimeFile(file), file).toBe(true);
  });

  it("counts a value import that follows an `import type` line without a semicolon", () => {
    const source = [
      'import type { Tier } from "./types.js"',
      'import { loadBundle } from "@gentle-ai/profile-data"',
    ].join("\n");
    expect(countImports(source)).toEqual({ mentions: 1, typeOnly: 0 });
  });

  it("counts an `export ... from` that follows an `import type` line without a semicolon", () => {
    const source = [
      'import type { A } from "./x.js"',
      'export { B } from "@gentle-ai/profile-data"',
    ].join("\n");
    expect(countImports(source)).toEqual({ mentions: 1, typeOnly: 0 });
  });

  it("accepts a multi-line `import type` of the data package", () => {
    const source = 'import type {\n  BundlePayload,\n  PhaseRecord,\n} from "@gentle-ai/profile-data";\n';
    expect(countImports(source)).toEqual({ mentions: 1, typeOnly: 1 });
  });
});

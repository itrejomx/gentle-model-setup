import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
    // Every quoted mention of the specifier must belong to a type-only import.
    // That rules out value imports, `export ... from`, bare side-effect
    // imports, dynamic `import()`, and `require`.
    const mention = /["']@gentle-ai\/profile-data["']/g;
    const typeOnlyImport = /^\s*import type\b[^;]*?from\s+["']@gentle-ai\/profile-data["']/gms;
    const files = sourceFiles(join(packageRoot, "src"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source.match(mention)?.length ?? 0, file).toBe(source.match(typeOnlyImport)?.length ?? 0);
    }
  });
});

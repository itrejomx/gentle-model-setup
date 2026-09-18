import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { parse } from "yaml";
import type { DataError } from "./errors.js";

/**
 * Safe parse options for untrusted contributor YAML (threat matrix: untrusted
 * data parsing). `merge: false` and `maxAliasCount: 100` bound alias/merge-key
 * expansion so a billion-laughs style document throws instead of hanging.
 */
const YAML_PARSE_OPTIONS = {
  schema: "core",
  merge: false,
  maxAliasCount: 100,
} as const;

export function parseYaml(raw: string): unknown {
  return parse(raw, YAML_PARSE_OPTIONS);
}

/** Thrown by the loader entrypoint for a path or parse failure. Carries a
 * ready-made {@link DataError} so callers can aggregate it alongside schema
 * validation errors without re-deriving `file`/`field`. */
export class YamlLoadError extends Error {
  readonly dataError: DataError;

  constructor(dataError: DataError) {
    super(dataError.message);
    this.name = "YamlLoadError";
    this.dataError = dataError;
  }
}

/**
 * Resolves `filePath` and rejects it unless its real path (after following
 * symlinks) stays contained under `rootDir`'s real path. Guards the
 * "untrusted data parsing" threat: a fork PR could otherwise commit a
 * symlink that reads a file outside `data/`.
 */
export function resolveContainedPath(filePath: string, rootDir: string): string {
  const resolvedRoot = realpathSync(resolve(rootDir));
  let resolvedFile: string;
  try {
    resolvedFile = realpathSync(resolve(filePath));
  } catch (cause) {
    throw new YamlLoadError({
      file: filePath,
      field: "<path>",
      message: `unable to resolve path: ${(cause as Error).message}`,
    });
  }
  const isContained =
    resolvedFile === resolvedRoot || resolvedFile.startsWith(resolvedRoot + sep);
  if (!isContained) {
    throw new YamlLoadError({
      file: filePath,
      field: "<path>",
      message: `file escapes data root "${rootDir}" via symlink or path traversal`,
    });
  }
  return resolvedFile;
}

/**
 * Reads and parses a YAML file, enforcing realpath containment under
 * `rootDir` first. Throws {@link YamlLoadError} on containment failure,
 * unreadable file, or an unsafe/malformed document (including an
 * alias-bomb rejected by `maxAliasCount`).
 */
export function readYamlFile(filePath: string, rootDir: string): unknown {
  const containedPath = resolveContainedPath(filePath, rootDir);
  const raw = readFileSync(containedPath, "utf8");
  try {
    return parseYaml(raw);
  } catch (cause) {
    throw new YamlLoadError({
      file: filePath,
      field: "<document>",
      message: `failed to parse YAML: ${(cause as Error).message}`,
    });
  }
}

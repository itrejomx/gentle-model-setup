import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DataError } from "./errors.js";
import { DataValidationError } from "./errors.js";
import type {
  DataSet,
  ModelRecord,
  OverrideRecord,
  PhaseRecord,
  RuntimeRecord,
  SubscriptionRecord,
} from "./types.js";
import { readYamlFile, YamlLoadError } from "./yaml.js";
import {
  validateModel,
  validateOverride,
  validatePhases,
  validateRuntime,
  validateSubscription,
} from "./validate.js";

/**
 * Lists every `.yaml` file under `dir`, recursing into subdirectories
 * (`data/models/<subscription>/<model-id>.yaml`,
 * `data/overrides/<tier>/<phase>.yaml`), sorted for deterministic
 * iteration order. A missing `dir` (T10.13: `data/overrides/` does not
 * exist yet — this change ships no override data) yields no files rather
 * than an error; `loadData`'s aggregate-errors contract is about invalid
 * *content*, not about a collection that legitimately has zero rows.
 */
function listYamlFilesRecursive(dir: string): string[] {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listYamlFilesRecursive(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".yaml")) {
      files.push(fullPath);
    }
  }
  return files;
}

interface CollectionResult<T> {
  records: T[];
  errors: DataError[];
}

/**
 * Loads and validates every YAML file under `dir` as one item of a
 * collection: parses each file (containment-checked against `rootDir` by
 * `readYamlFile`, reused unchanged — T10.13 reuses the existing loader
 * containment rules rather than re-implementing them), validates it with
 * `validate`, and collects every error instead of stopping at the first
 * one, so `loadData` can aggregate across the whole tree.
 */
function loadCollection<T>(
  rootDir: string,
  dir: string,
  validate: (doc: unknown, file: string) => DataError[],
): CollectionResult<T> {
  const errors: DataError[] = [];
  const records: T[] = [];

  for (const file of listYamlFilesRecursive(dir)) {
    let doc: unknown;
    try {
      doc = readYamlFile(file, rootDir);
    } catch (cause) {
      if (cause instanceof YamlLoadError) {
        errors.push(cause.dataError);
        continue;
      }
      throw cause;
    }

    const docErrors = validate(doc, file);
    if (docErrors.length > 0) {
      errors.push(...docErrors);
      continue;
    }
    records.push(doc as T);
  }

  return { records, errors };
}

/**
 * `data/phases/phases.yaml` is one file holding a `phases` array, unlike
 * every other collection (one file per item), so it gets its own loader.
 */
function loadPhasesFile(rootDir: string, phasesPath: string): CollectionResult<PhaseRecord> {
  let doc: unknown;
  try {
    doc = readYamlFile(phasesPath, rootDir);
  } catch (cause) {
    if (cause instanceof YamlLoadError) {
      return { records: [], errors: [cause.dataError] };
    }
    throw cause;
  }

  const errors = validatePhases(doc, phasesPath);
  if (errors.length > 0) return { records: [], errors };

  const { phases } = doc as { phases: PhaseRecord[] };
  return { records: phases, errors: [] };
}

interface Assembly {
  dataSet: DataSet;
  errors: DataError[];
}

/**
 * Assembles a {@link DataSet} from every YAML collection under `rootDir`
 * (design.md's Loader API), aggregating every validation error found
 * across every file instead of stopping at the first one. Shared by
 * {@link loadData} and {@link validateData} so both report exactly the
 * same errors for the same tree.
 */
function assembleDataSet(rootDir: string): Assembly {
  const resolvedRoot = resolve(rootDir);
  const errors: DataError[] = [];

  const subscriptions = loadCollection<SubscriptionRecord>(
    resolvedRoot,
    join(resolvedRoot, "subscriptions"),
    validateSubscription,
  );
  errors.push(...subscriptions.errors);

  const models = loadCollection<ModelRecord>(
    resolvedRoot,
    join(resolvedRoot, "models"),
    validateModel,
  );
  errors.push(...models.errors);

  const phases = loadPhasesFile(resolvedRoot, join(resolvedRoot, "phases", "phases.yaml"));
  errors.push(...phases.errors);

  const runtimes = loadCollection<RuntimeRecord>(
    resolvedRoot,
    join(resolvedRoot, "runtimes"),
    validateRuntime,
  );
  errors.push(...runtimes.errors);

  // data/overrides/<tier>/<phase>.yaml (docs/superpowers/specs/2026-09-14-
  // model-profile-site-design.md section 4). This change ships no override
  // data (bundle spec: "Overrides collection is empty in this change"), so
  // a missing data/overrides/ directory is not itself an error.
  const overrides = loadCollection<OverrideRecord>(
    resolvedRoot,
    join(resolvedRoot, "overrides"),
    validateOverride,
  );
  errors.push(...overrides.errors);

  return {
    dataSet: {
      subscriptions: subscriptions.records,
      models: models.records,
      phases: phases.records,
      overrides: overrides.records,
      runtimes: runtimes.records,
    },
    errors,
  };
}

/**
 * Assembles a real {@link DataSet} from `data/` on disk: parses and
 * validates every subscription, model, the phases file, every runtime, and
 * every override, aggregating every error before throwing (design.md's
 * Loader API: `loadData` "throws DataValidationError with ALL errors") so
 * a contributor fixes every field in one pass, never fails fast.
 */
export async function loadData(rootDir: string): Promise<DataSet> {
  const { dataSet, errors } = assembleDataSet(rootDir);
  if (errors.length > 0) {
    throw new DataValidationError(errors);
  }
  return dataSet;
}

/**
 * Same assembly as {@link loadData}, but returns every error instead of
 * throwing (design.md's Loader API: `[] means valid`).
 */
export async function validateData(rootDir: string): Promise<DataError[]> {
  const { errors } = assembleDataSet(rootDir);
  return errors;
}

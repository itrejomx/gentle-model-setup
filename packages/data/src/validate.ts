import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { DataError } from "./errors.js";

/**
 * TypeScript 7's `nodenext` module resolution double-wraps the synthesized
 * default export of these CommonJS packages (`AjvModule.default` types as
 * the whole module namespace instead of the class/function). A type-only
 * `typeof import(...)` query resolves correctly; only the *value* import
 * elaboration is affected. Loading the real values through `createRequire`
 * and casting to the correctly-resolved type keeps both compile-time types
 * and runtime behavior accurate.
 */
type Ajv2020Ctor = typeof import("ajv/dist/2020.js").default;
type AddFormatsFn = typeof import("ajv-formats").default;

const nodeRequire = createRequire(import.meta.url);
const Ajv2020 = nodeRequire("ajv/dist/2020.js").default as Ajv2020Ctor;
const addFormats = nodeRequire("ajv-formats").default as AddFormatsFn;

const STRENGTH_AXES = [
  "oneShotReasoning",
  "sustainedReasoning",
  "codingTools",
  "longContext",
  "multimodal",
  "cheap",
] as const;

type StrengthAxis = (typeof STRENGTH_AXES)[number];

function loadSchema(relativePath: string): object {
  const schemaPath = fileURLToPath(new URL(relativePath, import.meta.url));
  return JSON.parse(readFileSync(schemaPath, "utf8")) as object;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const subscriptionSchema = loadSchema(
  "../../../data/schemas/subscription.schema.json",
);
const modelSchema = loadSchema("../../../data/schemas/model.schema.json");
const phasesSchema = loadSchema("../../../data/schemas/phases.schema.json");
const runtimeSchema = loadSchema("../../../data/schemas/runtime.schema.json");
const overrideSchema = loadSchema(
  "../../../data/schemas/override.schema.json",
);

const validateSubscriptionSchema = ajv.compile(subscriptionSchema);
const validateModelSchema = ajv.compile(modelSchema);
const validatePhasesSchema = ajv.compile(phasesSchema);
const validateRuntimeSchema = ajv.compile(runtimeSchema);
const validateOverrideSchema = ajv.compile(overrideSchema);

function instancePathToField(
  instancePath: string,
  missingProperty: string | undefined,
): string {
  const base = instancePath.startsWith("/")
    ? instancePath.slice(1).split("/").join(".")
    : instancePath;
  if (missingProperty !== undefined) {
    return base.length > 0 ? `${base}.${missingProperty}` : missingProperty;
  }
  return base.length > 0 ? base : "<document>";
}

function toDataErrors(
  file: string,
  errors: ErrorObject[] | null | undefined,
): DataError[] {
  if (!errors) return [];
  return errors.map((error) => {
    const missingProperty = (error.params as { missingProperty?: string })
      .missingProperty;
    return {
      file,
      field: instancePathToField(error.instancePath, missingProperty),
      message: error.message ?? "validation failed",
    };
  });
}

function validateAgainstSchema(
  validateFn: ValidateFunction,
  doc: unknown,
  file: string,
): DataError[] {
  const valid = validateFn(doc);
  if (valid) return [];
  return toDataErrors(file, validateFn.errors);
}

/**
 * Re-runs the six-axis Strength-3 evidence rule over the parsed document and
 * names exactly the offending axis. The schema's `allOf` if/then blocks
 * reject the document too, but cannot say which axis broke; this check can.
 */
function checkStrengthEvidence(doc: unknown, file: string): DataError[] {
  if (typeof doc !== "object" || doc === null) return [];
  const record = doc as Record<string, unknown>;
  const strengths = record["strengths"];
  if (typeof strengths !== "object" || strengths === null) return [];
  const strengthsRecord = strengths as Record<string, unknown>;
  const evidence = record["evidence"];
  const evidenceRecord = (
    typeof evidence === "object" && evidence !== null ? evidence : {}
  ) as Record<string, unknown>;

  const errors: DataError[] = [];
  for (const axis of STRENGTH_AXES) {
    if (strengthsRecord[axis] !== 3) continue;
    const evidenceValue = evidenceRecord[axis];
    const hasEvidence =
      typeof evidenceValue === "string" && evidenceValue.trim().length > 0;
    if (!hasEvidence) {
      errors.push(buildStrengthEvidenceError(file, axis));
    }
  }
  return errors;
}

function buildStrengthEvidenceError(
  file: string,
  axis: StrengthAxis,
): DataError {
  return {
    file,
    field: `strengths.${axis}`,
    message: `strength 3 on axis "${axis}" requires a non-empty evidence.${axis} string`,
  };
}

export function validateSubscription(doc: unknown, file: string): DataError[] {
  return validateAgainstSchema(validateSubscriptionSchema, doc, file);
}

/**
 * `status: current` requires at least one plan with a numeric
 * `requestsPer5h`. The schema types `requestsPer5h` as `number | null` to
 * allow unpublished caps on `legacy`/`experimental` rows, so it cannot by
 * itself reject a `current` model whose every plan has a `null` cap
 * (minimax-m2.5: absent from the live requests table). This check closes
 * that gap.
 */
function checkCurrentRequiresCap(doc: unknown, file: string): DataError[] {
  if (typeof doc !== "object" || doc === null) return [];
  const record = doc as Record<string, unknown>;
  if (record["status"] !== "current") return [];

  const plans = record["plans"];
  if (typeof plans !== "object" || plans === null) return [];
  const hasNumericCap = Object.values(plans as Record<string, unknown>).some(
    (plan) => {
      if (typeof plan !== "object" || plan === null) return false;
      const requestsPer5h = (plan as Record<string, unknown>)["requestsPer5h"];
      return typeof requestsPer5h === "number";
    },
  );
  if (hasNumericCap) return [];

  return [
    {
      file,
      field: "status",
      message:
        'status "current" requires at least one plan with a numeric requestsPer5h, but every plan has requestsPer5h: null',
    },
  ];
}

export function validateModel(doc: unknown, file: string): DataError[] {
  const schemaErrors = validateAgainstSchema(validateModelSchema, doc, file);
  const strengthErrors = checkStrengthEvidence(doc, file);
  const capErrors = checkCurrentRequiresCap(doc, file);
  return [...schemaErrors, ...strengthErrors, ...capErrors];
}

export function validatePhases(doc: unknown, file: string): DataError[] {
  return validateAgainstSchema(validatePhasesSchema, doc, file);
}

export function validateRuntime(doc: unknown, file: string): DataError[] {
  return validateAgainstSchema(validateRuntimeSchema, doc, file);
}

export function validateOverride(doc: unknown, file: string): DataError[] {
  return validateAgainstSchema(validateOverrideSchema, doc, file);
}

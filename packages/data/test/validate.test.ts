import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  validateModel,
  validateOverride,
  validatePhases,
  validateRuntime,
  validateSubscription,
} from "../src/validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

function loadFixture(relativePath: string): unknown {
  const raw = readFileSync(join(fixturesDir, relativePath), "utf8");
  return parse(raw);
}

interface ExpectedError {
  field: string;
  message: string;
}

function loadExpectedErrors(relativePath: string): ExpectedError[] {
  const raw = readFileSync(join(fixturesDir, relativePath), "utf8");
  return JSON.parse(raw) as ExpectedError[];
}

describe("validateSubscription", () => {
  it("accepts a valid capped subscription", () => {
    const doc = loadFixture("valid/subscription/subscription.yaml");
    expect(validateSubscription(doc, "subscription.yaml")).toEqual([]);
  });

  it("rejects a subscription missing billingModel, naming the field", () => {
    const doc = loadFixture(
      "invalid/subscription-missing-billing-model/subscription.yaml",
    );
    const expected = loadExpectedErrors(
      "invalid/subscription-missing-billing-model/expected-errors.json",
    );
    const errors = validateSubscription(doc, "subscription.yaml");

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((error) => error.file === "subscription.yaml")).toBe(
      true,
    );
    for (const expectation of expected) {
      expect(
        errors.some(
          (error) =>
            error.field === expectation.field &&
            error.message.includes(expectation.message),
        ),
      ).toBe(true);
    }
  });

  // Issue #32: the threshold rules `deriveBudgetClass` depends on (strictly
  // ascending `max`, a trailing `null` max) were only enforced lazily inside
  // `deriveBudgetClass`, so `validateData` never caught a broken list.
  it("rejects thresholds whose last entry's max is not null, naming the field", () => {
    const doc = loadFixture(
      "invalid/subscription-threshold-last-not-null/subscription.yaml",
    );
    const expected = loadExpectedErrors(
      "invalid/subscription-threshold-last-not-null/expected-errors.json",
    );
    const errors = validateSubscription(doc, "subscription.yaml");

    expect(errors.every((error) => error.file === "subscription.yaml")).toBe(
      true,
    );
    for (const expectation of expected) {
      expect(
        errors.some(
          (error) =>
            error.field === expectation.field &&
            error.message.includes(expectation.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects thresholds whose max values are not strictly ascending, naming the field", () => {
    const doc = loadFixture(
      "invalid/subscription-threshold-not-ascending/subscription.yaml",
    );
    const expected = loadExpectedErrors(
      "invalid/subscription-threshold-not-ascending/expected-errors.json",
    );
    const errors = validateSubscription(doc, "subscription.yaml");

    expect(errors.every((error) => error.file === "subscription.yaml")).toBe(
      true,
    );
    for (const expectation of expected) {
      expect(
        errors.some(
          (error) =>
            error.field === expectation.field &&
            error.message.includes(expectation.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects a null max before the last entry, naming the field", () => {
    const doc = loadFixture(
      "invalid/subscription-threshold-null-before-last/subscription.yaml",
    );
    const expected = loadExpectedErrors(
      "invalid/subscription-threshold-null-before-last/expected-errors.json",
    );
    const errors = validateSubscription(doc, "subscription.yaml");

    expect(errors.every((error) => error.file === "subscription.yaml")).toBe(
      true,
    );
    for (const expectation of expected) {
      expect(
        errors.some(
          (error) =>
            error.field === expectation.field &&
            error.message.includes(expectation.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects an empty thresholds list, naming the field", () => {
    const doc = loadFixture(
      "invalid/subscription-threshold-empty/subscription.yaml",
    );
    const errors = validateSubscription(doc, "subscription.yaml");

    expect(errors.every((error) => error.file === "subscription.yaml")).toBe(
      true,
    );
    expect(
      errors.some((error) => error.field === "budgetClass.thresholds"),
    ).toBe(true);
  });
});

describe("validateModel", () => {
  it("accepts a valid model with strength-3 evidence", () => {
    const doc = loadFixture("valid/model/model.yaml");
    expect(validateModel(doc, "model.yaml")).toEqual([]);
  });

  it("rejects a wrong field type, naming file and field", () => {
    const doc = loadFixture("invalid/model-wrong-field-type/model.yaml");
    const expected = loadExpectedErrors(
      "invalid/model-wrong-field-type/expected-errors.json",
    );
    const errors = validateModel(doc, "model.yaml");

    expect(errors.every((error) => error.file === "model.yaml")).toBe(true);
    for (const expectation of expected) {
      expect(
        errors.some(
          (error) =>
            error.field === expectation.field &&
            error.message.includes(expectation.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects a strength-3 axis with no evidence, naming the axis", () => {
    const doc = loadFixture(
      "invalid/model-strength-three-no-evidence/model.yaml",
    );
    const errors = validateModel(doc, "model.yaml");

    expect(errors.some((error) => error.field === "strengths.multimodal")).toBe(
      true,
    );
  });

  // WU2 advisory (R3-blank-evidence-unproved): whitespace-only evidence
  // passes the schema's `minLength: 1` but must still fail the code-level
  // check, which trims before checking length. Not previously tested.
  it("rejects a strength-3 axis whose evidence is whitespace only, naming the axis", () => {
    const doc = loadFixture("invalid/model-blank-evidence/model.yaml");
    const errors = validateModel(doc, "model.yaml");

    expect(errors.some((error) => error.field === "strengths.codingTools")).toBe(
      true,
    );
  });

  it("rejects a path-traversal id, naming the id field", () => {
    const doc = loadFixture("invalid/model-bad-id/model.yaml");
    const errors = validateModel(doc, "model.yaml");

    expect(errors.some((error) => error.field === "id")).toBe(true);
  });

  // checkCurrentRequiresCap: a `current` model needs only one plan with a
  // numeric requestsPer5h among several, some of which are null.
  it("accepts a current model with several plans where only one has a numeric cap", () => {
    const doc = loadFixture("valid/model-multi-plan-partial-caps/model.yaml");
    expect(validateModel(doc, "model.yaml")).toEqual([]);
  });

  it("rejects a current model whose every plan has a null cap, naming the file and the exact message", () => {
    const doc = loadFixture("invalid/model-all-null-caps/model.yaml");
    const expected = loadExpectedErrors(
      "invalid/model-all-null-caps/expected-errors.json",
    );
    const errors = validateModel(doc, "model.yaml");

    const statusError = errors.find((error) => error.field === "status");
    expect(statusError).toBeDefined();
    expect(statusError?.file).toBe("model.yaml");
    expect(statusError?.message).toBe(expected[0]?.message);
  });

  // T9.7 (slice 8 advisory): compare the FULL expected error list (field,
  // message, and count), not only that a matching status error exists among
  // possibly others. This fixture is otherwise schema-valid, so the all-null
  // caps rejection must be the only error.
  it("rejects a current model whose every plan has a null cap, matching the full expected error list", () => {
    const doc = loadFixture("invalid/model-all-null-caps/model.yaml");
    const expected = loadExpectedErrors(
      "invalid/model-all-null-caps/expected-errors.json",
    );
    const errors = validateModel(doc, "model.yaml");

    expect(errors.length).toBe(expected.length);
    expect(errors).toEqual(
      expected.map((expectation) => ({
        file: "model.yaml",
        field: expectation.field,
        message: expectation.message,
      })),
    );
  });
});

describe("validatePhases", () => {
  it("accepts a valid phases collection", () => {
    const doc = loadFixture("valid/phases/phases.yaml");
    expect(validatePhases(doc, "phases.yaml")).toEqual([]);
  });

  it("rejects a phase entry missing a weights axis, naming the field", () => {
    const doc = loadFixture(
      "invalid/phases-missing-weights-axis/phases.yaml",
    );
    const errors = validatePhases(doc, "phases.yaml");

    expect(errors.every((error) => error.file === "phases.yaml")).toBe(true);
    expect(
      errors.some((error) => error.field === "phases.0.weights.cheap"),
    ).toBe(true);
  });

  // The JSON Schema has no way to reject a duplicate array entry, so phase-id
  // uniqueness is a code check (mirrors `checkCurrentRequiresCap` in shape).
  it("rejects a duplicate phase id, naming the id", () => {
    const doc = loadFixture("invalid/phases-duplicate-id/phases.yaml");
    const errors = validatePhases(doc, "phases.yaml");

    expect(errors.every((error) => error.file === "phases.yaml")).toBe(true);
    expect(
      errors.some(
        (error) =>
          error.field === "phases.1.id" && error.message.includes("sdd-apply"),
      ),
    ).toBe(true);
  });

  // T9.7 (slice 8 advisory): also check the "first declared at" index the
  // duplicate-id message names, not only that the message mentions the id.
  it("rejects a duplicate phase id, naming the first-declared index", () => {
    const doc = loadFixture("invalid/phases-duplicate-id/phases.yaml");
    const errors = validatePhases(doc, "phases.yaml");

    const duplicateError = errors.find((error) => error.field === "phases.1.id");
    expect(duplicateError).toBeDefined();
    expect(duplicateError?.message).toBe(
      'duplicate phase id "sdd-apply" (first declared at phases.0.id)',
    );
  });
});

describe("validateRuntime", () => {
  it("accepts a valid runtime mapping", () => {
    const doc = loadFixture("valid/runtime/runtime.yaml");
    expect(validateRuntime(doc, "runtime.yaml")).toEqual([]);
  });

  it("rejects a non-string agentMap value, naming the field", () => {
    const doc = loadFixture(
      "invalid/runtime-agentmap-non-string/runtime.yaml",
    );
    const errors = validateRuntime(doc, "runtime.yaml");

    expect(errors.every((error) => error.file === "runtime.yaml")).toBe(true);
    expect(
      errors.some((error) => error.field === "agentMap.sdd-propose"),
    ).toBe(true);
  });
});

describe("validateOverride", () => {
  it("accepts a valid override", () => {
    const doc = loadFixture("valid/override/override.yaml");
    expect(validateOverride(doc, "override.yaml")).toEqual([]);
  });

  it("rejects a tier outside the enum, naming the field", () => {
    const doc = loadFixture("invalid/override-bad-tier/override.yaml");
    const errors = validateOverride(doc, "override.yaml");

    expect(errors.every((error) => error.file === "override.yaml")).toBe(
      true,
    );
    expect(errors.some((error) => error.field === "tier")).toBe(true);
  });

  // WU2 advisory (R3-additional-properties-field-unnamed): Ajv's default
  // additionalProperties error names the object it rejected, not the extra
  // key itself, so the offending field must be named explicitly.
  it("rejects an unknown top-level field, naming it in both the field and the message", () => {
    const doc = loadFixture("invalid/override-unknown-field/override.yaml");
    const errors = validateOverride(doc, "override.yaml");

    const unknownFieldError = errors.find((error) =>
      error.field.endsWith("notAField"),
    );
    expect(unknownFieldError).toBeDefined();
    expect(unknownFieldError?.message).toContain("notAField");
  });
});

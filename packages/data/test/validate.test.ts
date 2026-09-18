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

  it("rejects a path-traversal id, naming the id field", () => {
    const doc = loadFixture("invalid/model-bad-id/model.yaml");
    const errors = validateModel(doc, "model.yaml");

    expect(errors.some((error) => error.field === "id")).toBe(true);
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
});

import { describe, expect, it } from "vitest";
import { checkCrossFileIntegrity } from "../src/integrity.js";
import type {
  DataSet,
  ModelRecord,
  PhaseRecord,
  RuntimeRecord,
  SubscriptionRecord,
} from "../src/types.js";

/**
 * Cross-file checks no single-file validator can express, because they
 * compare one file's content against another's (T10.10, reopened from the
 * slice 9 review). Every fixture below is fabricated in-memory — never
 * copied from the real `data/` tree — so a real regression is caught by
 * `runtime-mappings.test.ts`'s own data-derived assertion, not duplicated
 * here.
 */

const PHASES: PhaseRecord[] = [
  { id: "sdd-apply", group: "sdd", callPattern: "loop", role: "implementer", weights: {} },
];

const SUBSCRIPTIONS: SubscriptionRecord[] = [
  {
    id: "fixture-sub",
    displayName: "Fixture Subscription",
    providerPrefix: "fixture-sub",
    billingModel: "capped",
    budgetClass: { derivedFrom: "requestsPer5h", thresholds: [{ class: "volume", max: null }] },
    catalogSourceUrl: "https://example.com/catalog",
    verifiedAt: "2026-09-17",
  },
];

function dataSetWithRuntime(runtime: RuntimeRecord): DataSet {
  return {
    subscriptions: SUBSCRIPTIONS,
    models: [],
    phases: PHASES,
    overrides: [],
    runtimes: [runtime],
  };
}

describe("checkCrossFileIntegrity", () => {
  it("accepts a runtime whose agentMap and prefixMap both resolve", () => {
    const runtime: RuntimeRecord = {
      id: "fixture-runtime",
      displayName: "Fixture Runtime",
      agentMap: { "sdd-apply": "sdd-apply" },
      prefixMap: { "fixture-sub": "fixture-sub" },
    };
    expect(checkCrossFileIntegrity(dataSetWithRuntime(runtime))).toEqual([]);
  });

  it("rejects an agentMap value that is not a phase id in phases.yaml", () => {
    const runtime: RuntimeRecord = {
      id: "fixture-runtime",
      displayName: "Fixture Runtime",
      agentMap: { "made-up-agent": "not-a-real-phase" },
      prefixMap: { "fixture-sub": "fixture-sub" },
    };
    const errors = checkCrossFileIntegrity(dataSetWithRuntime(runtime));
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: "data/runtimes/fixture-runtime.yaml",
        field: "agentMap.made-up-agent",
      }),
    );
  });

  it("rejects two agentMap entries that target the same phase id", () => {
    const runtime: RuntimeRecord = {
      id: "fixture-runtime",
      displayName: "Fixture Runtime",
      agentMap: { "first-name": "sdd-apply", "second-name": "sdd-apply" },
      prefixMap: { "fixture-sub": "fixture-sub" },
    };
    const errors = checkCrossFileIntegrity(dataSetWithRuntime(runtime));
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: "data/runtimes/fixture-runtime.yaml",
        field: "agentMap.second-name",
      }),
    );
  });

  it("rejects a prefixMap key that is not a subscription providerPrefix", () => {
    const runtime: RuntimeRecord = {
      id: "fixture-runtime",
      displayName: "Fixture Runtime",
      agentMap: { "sdd-apply": "sdd-apply" },
      prefixMap: { "unknown-prefix": "whatever" },
    };
    const errors = checkCrossFileIntegrity(dataSetWithRuntime(runtime));
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: "data/runtimes/fixture-runtime.yaml",
        field: "prefixMap.unknown-prefix",
      }),
    );
  });

  it("accepts the explicit, example-only openai prefixMap exception with no subscription backing it", () => {
    const runtime: RuntimeRecord = {
      id: "fixture-runtime",
      displayName: "Fixture Runtime",
      agentMap: { "sdd-apply": "sdd-apply" },
      prefixMap: { openai: "openai-codex" },
    };
    const dataSet: DataSet = {
      subscriptions: [],
      models: [],
      phases: PHASES,
      overrides: [],
      runtimes: [runtime],
    };
    expect(checkCrossFileIntegrity(dataSet)).toEqual([]);
  });
});

/**
 * A model whose `subscription` does not resolve is an integrity error, not
 * a degraded bundle (T11.3, slice 10 review): `injectBudgetClasses`
 * previously fell back to an empty threshold list for a dangling
 * subscription, which either silently derived `budgetClass: null` (when
 * `requestsPer5h` was itself `null`) or threw an untyped `Error` from
 * `deriveBudgetClass` — never the aggregated, typed `DataValidationError`
 * every other integrity failure produces.
 */
function fixtureModel(overrides: Partial<ModelRecord> = {}): ModelRecord {
  return {
    id: "fixture-model",
    subscription: "fixture-sub",
    displayName: "Fixture Model",
    lab: "moonshot",
    status: "current",
    strengths: {
      oneShotReasoning: 1,
      sustainedReasoning: 1,
      codingTools: 1,
      longContext: 1,
      multimodal: 0,
      cheap: 1,
    },
    privacy: { trainsOnData: false, logRetentionDays: 0 },
    effortVariants: ["medium"],
    plans: {
      go: {
        requestsPer5h: 1350,
        requestsPerWeek: 6500,
        requestsPerMonth: 26000,
        monthlyUsdBucket: 10,
        source: "https://example.com/catalog",
        verifiedAt: "2026-09-18",
      },
    },
    ...overrides,
  };
}

describe("checkCrossFileIntegrity: dangling model subscription (T11.3)", () => {
  it("accepts a model whose subscription resolves to a declared subscription", () => {
    const dataSet: DataSet = {
      subscriptions: SUBSCRIPTIONS,
      models: [fixtureModel({ subscription: "fixture-sub" })],
      phases: PHASES,
      overrides: [],
      runtimes: [],
    };
    expect(checkCrossFileIntegrity(dataSet)).toEqual([]);
  });

  it("rejects a model whose subscription does not resolve to any declared subscription", () => {
    const dataSet: DataSet = {
      subscriptions: SUBSCRIPTIONS,
      models: [fixtureModel({ subscription: "no-such-subscription" })],
      phases: PHASES,
      overrides: [],
      runtimes: [],
    };
    const errors = checkCrossFileIntegrity(dataSet);
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: "data/models/no-such-subscription/fixture-model.yaml",
        field: "subscription",
      }),
    );
  });
});

/**
 * `budgetClass.derivedFrom` is `requestsPer5h | pricePerMTok` per the
 * schema, but only `requestsPer5h` derivation is implemented
 * (`deriveBudgetClass` and `injectBudgetClasses` both only ever read
 * `requestsPer5h`). A subscription declaring `pricePerMTok` must fail
 * loudly instead of silently deriving every model's Budget Class from the
 * wrong metric (T11.3).
 */
describe("checkCrossFileIntegrity: unsupported budgetClass.derivedFrom (T11.3)", () => {
  it("accepts a subscription declaring the supported requestsPer5h derivation", () => {
    const dataSet: DataSet = {
      subscriptions: SUBSCRIPTIONS,
      models: [],
      phases: PHASES,
      overrides: [],
      runtimes: [],
    };
    expect(checkCrossFileIntegrity(dataSet)).toEqual([]);
  });

  it("rejects a subscription declaring an unimplemented budgetClass.derivedFrom", () => {
    const unsupportedSubscription: SubscriptionRecord = {
      ...SUBSCRIPTIONS[0]!,
      id: "unsupported-sub",
      budgetClass: { derivedFrom: "pricePerMTok", thresholds: [{ class: "volume", max: null }] },
    };
    const dataSet: DataSet = {
      subscriptions: [unsupportedSubscription],
      models: [],
      phases: PHASES,
      overrides: [],
      runtimes: [],
    };
    const errors = checkCrossFileIntegrity(dataSet);
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: "data/subscriptions/unsupported-sub.yaml",
        field: "budgetClass.derivedFrom",
      }),
    );
  });
});

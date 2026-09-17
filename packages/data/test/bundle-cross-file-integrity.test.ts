import { describe, expect, it } from "vitest";
import { checkCrossFileIntegrity } from "../src/integrity.js";
import type { DataSet, PhaseRecord, RuntimeRecord, SubscriptionRecord } from "../src/types.js";

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

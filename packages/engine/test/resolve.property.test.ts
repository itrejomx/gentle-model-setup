import type { BudgetClass, BundleModelRecord, BundlePayload, PhaseRecord } from "@gentle-ai/profile-data";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { filterByCallPattern } from "../src/budget.js";
import { buildPool } from "../src/pool.js";
import { resolveProfile } from "../src/resolve.js";
import type { Selection, Tier } from "../src/types.js";
import { catalog } from "./fixtures/catalog.js";

const SEED = 20261007;
const NUM_RUNS = 300;
const PLAN = "plan";
const AXES = ["oneShotReasoning", "sustainedReasoning", "codingTools", "longContext", "multimodal", "cheap"];
const CLASSES: (BudgetClass | null)[] = ["sniper", "semi", "workhorse", "volume", null];
const SUBSCRIPTIONS = ["sub-a", "sub-b", "sub-c"];

const baseSubscription = catalog.subscriptions[0];
const baseModel = catalog.models[0];
const basePlan = baseModel?.plans["basic"];
if (baseSubscription === undefined || baseModel === undefined || basePlan === undefined) {
  throw new Error("fixture catalog changed shape");
}

const strengthsArb = fc.record(Object.fromEntries(AXES.map((axis) => [axis, fc.integer({ min: 0, max: 3 })])));

const modelSpecArb = fc.record({
  strengths: strengthsArb,
  status: fc.constantFrom("current", "current", "current", "legacy", "experimental"),
  trainsOnData: fc.boolean(),
  logRetentionDays: fc.constantFrom(null, 0, 30, 90),
  effortVariants: fc.constantFrom<string[]>([], ["high"]),
  budgetClass: fc.constantFrom(...CLASSES),
});

const phaseArb = fc.record({
  callPattern: fc.constantFrom("loop", "one-shot"),
  weights: strengthsArb,
});

const payloadArb: fc.Arbitrary<BundlePayload> = fc
  .record({
    subscriptionCount: fc.integer({ min: 1, max: 3 }),
    billing: fc.array(fc.constantFrom<"capped" | "metered">("capped", "metered"), { minLength: 3, maxLength: 3 }),
    // Up to fourteen models per Subscription so a chain can reach the cap of ten.
    models: fc.array(fc.array(modelSpecArb, { maxLength: 14 }), { minLength: 3, maxLength: 3 }),
    phases: fc.array(phaseArb, { minLength: 1, maxLength: 4 }),
  })
  .map(({ subscriptionCount, billing, models, phases }) => {
    const ids = SUBSCRIPTIONS.slice(0, subscriptionCount);
    const records: BundleModelRecord[] = ids.flatMap((subscription, s) =>
      (models[s] ?? []).map((spec, index) => ({
        ...baseModel,
        id: `m${index}`,
        subscription,
        strengths: spec.strengths,
        status: spec.status,
        privacy: { trainsOnData: spec.trainsOnData, logRetentionDays: spec.logRetentionDays },
        effortVariants: spec.effortVariants,
        plans: { [PLAN]: { ...basePlan, budgetClass: spec.budgetClass } },
      })),
    );
    const phaseRecords: PhaseRecord[] = phases.map((phase, index) => ({
      id: `phase-${index}`,
      group: "test",
      callPattern: phase.callPattern,
      role: "neutral",
      weights: phase.weights,
    }));
    return {
      ...catalog,
      subscriptions: ids.map((id, s) => ({
        ...baseSubscription,
        id,
        providerPrefix: id,
        billingModel: billing[s] ?? "capped",
        plans: [{ id: PLAN, displayName: PLAN }],
      })),
      models: records,
      phases: phaseRecords,
    };
  });

const selectionArb = (payload: BundlePayload) =>
  fc.record({
    tier: fc.constantFrom<Tier>("HIGH", "BALANCED", "LEAN"),
    clientCode: fc.boolean(),
    maxLogRetentionDays: fc.constantFrom<number | undefined>(undefined, 0, 30, 90),
  }).map(({ tier, clientCode, maxLogRetentionDays }): Selection => ({
    subscriptions: payload.subscriptions.map((subscription) => ({ subscription: subscription.id, plan: PLAN })),
    tier,
    constraints: maxLogRetentionDays === undefined ? { clientCode } : { clientCode, maxLogRetentionDays },
  }));

const scenarioArb = payloadArb.chain((payload) =>
  selectionArb(payload).map((selection) => ({ payload, selection })),
);

const options = { seed: SEED, numRuns: NUM_RUNS };

describe("resolveProfile properties", () => {
  it("never puts a sniper in a loop Phase, as primary or fallback", () => {
    fc.assert(
      fc.property(scenarioArb, ({ payload, selection }) => {
        const classes = new Map(
          payload.models.map((model) => [`${model.subscription}/${model.id}`, model.plans[PLAN]?.budgetClass]),
        );
        const profile = resolveProfile(payload, selection);
        for (const row of profile.rows) {
          const phase = payload.phases.find((candidate) => candidate.id === row.phase);
          if (phase?.callPattern !== "loop") continue;
          const chain = row.primary === null ? row.fallbacks : [row.primary, ...row.fallbacks];
          for (const id of chain) expect(classes.get(id)).not.toBe("sniper");
        }
      }),
      options,
    );
  });

  it("gives a chain of 2 to 10 fallbacks whenever a Phase has at least three eligible survivors", () => {
    let checked = 0;
    fc.assert(
      fc.property(scenarioArb, ({ payload, selection }) => {
        const { candidates } = buildPool(payload, selection);
        const profile = resolveProfile(payload, selection);
        for (const row of profile.rows) {
          const phase = payload.phases.find((candidate) => candidate.id === row.phase);
          if (phase === undefined) throw new Error(`row for unknown Phase ${row.phase}`);
          const survivors = filterByCallPattern(candidates, phase.callPattern).kept.length;
          if (survivors < 3) continue;
          checked += 1;
          expect(row.fallbacks.length).toBeGreaterThanOrEqual(2);
          expect(row.fallbacks.length).toBeLessThanOrEqual(10);
          expect(row.fallbacks.length).toBe(Math.min(survivors - 1, 10));
        }
      }),
      options,
    );
    expect(checked).toBeGreaterThan(0);
  });

  it("does not depend on the order of the models in the payload", () => {
    fc.assert(
      fc.property(scenarioArb, fc.array(fc.integer(), { minLength: 1, maxLength: 42 }), ({ payload, selection }, keys) => {
        const keyed = payload.models.map((model, index) => ({ model, key: keys[index % keys.length] ?? 0, index }));
        keyed.sort((a, b) => a.key - b.key || a.index - b.index);
        const permuted = { ...payload, models: keyed.map((entry) => entry.model) };
        expect(resolveProfile(permuted, selection)).toEqual(resolveProfile(payload, selection));
      }),
      options,
    );
  });
});

import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildBundle,
  deriveBudgetClass,
  readYamlFile,
  validateModel,
  validateSubscription,
} from "../src/index.js";
import type { DataSet, ModelRecord, SubscriptionRecord, Threshold } from "../src/types.js";

/**
 * Expected ids for the OpenCode Go catalog, grouped by the work unit that
 * introduces them. This slice (moonshot/zhipu/xai/openai) is the first of
 * several catalog PRs; later slices append their own ids here rather than
 * replacing this list, so the full catalog test grows incrementally instead
 * of being written all at once.
 */
const MOONSHOT_ZHIPU_XAI_OPENAI_IDS = [
  "kimi-k3",
  "kimi-k2.7-code",
  "kimi-k2.6",
  "glm-5.3-flash",
  "glm-5.3",
  "glm-5.2",
  "glm-5.1",
  "grok-4.6",
  "grok-4.5",
  "gpt-5.6-luna",
] as const;

/**
 * Work Unit 6 (Phase 6): alibaba and deepseek.
 */
const ALIBABA_DEEPSEEK_IDS = [
  "qwen3.8-max",
  "qwen3.8-flash",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.6-plus",
  "deepseek-v4.1-flash",
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  "deepseek-v4-flash-vision-exp",
] as const;

/**
 * Work Unit 7 (Phase 7): minimax, xiaomi, tencent, meituan, meta.
 */
const MINIMAX_XIAOMI_TENCENT_MEITUAN_META_IDS = [
  "minimax-m3",
  "minimax-m2.7",
  "minimax-m2.5",
  "mimo-v2.5",
  "mimo-v2.5-pro",
  "hy3",
  "hy4-preview",
  "longcat-2.0",
  "muse-spark-1.2-contributor",
  "muse-spark-1.3-contributor",
] as const;

const EXPECTED_IDS: readonly string[] = [
  ...MOONSHOT_ZHIPU_XAI_OPENAI_IDS,
  ...ALIBABA_DEEPSEEK_IDS,
  ...MINIMAX_XIAOMI_TENCENT_MEITUAN_META_IDS,
];

const EXPECTED_STATUS_COUNTS: Record<string, number> = {
  current: 19,
  legacy: 6,
  experimental: 4,
};

const STRENGTH_AXES = [
  "oneShotReasoning",
  "sustainedReasoning",
  "codingTools",
  "longContext",
  "multimodal",
  "cheap",
] as const;

interface ModelDoc {
  id: string;
  lab: string;
  status: string;
  strengths: Record<string, number>;
  evidence?: Record<string, string>;
  privacy: { trainsOnData: boolean; logRetentionDays: number | null };
  effortVariants: string[];
  plans: Record<
    string,
    {
      verifiedAt: string;
      requestsPer5h: number | null;
      multiplier?: number;
      multiplierExpiresAt?: string;
    }
  >;
}

interface SubscriptionDoc {
  budgetClass: { derivedFrom: string; thresholds: Threshold[] };
}

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(here, "../../../data");
const modelsDir = join(dataRoot, "models/opencode-go");
const subscriptionPath = join(dataRoot, "subscriptions/opencode-go.yaml");

function modelPath(id: string): string {
  return join(modelsDir, `${id}.yaml`);
}

function loadModel(id: string): ModelDoc {
  return readYamlFile(modelPath(id), dataRoot) as ModelDoc;
}

describe("opencode-go catalog", () => {
  it("has exactly the expected model files for the full catalog", () => {
    const files = readdirSync(modelsDir).filter((name) => name.endsWith(".yaml"));
    const ids = files.map((name) => name.replace(/\.yaml$/, "")).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it("has 29 files split 19 current / 6 legacy / 4 experimental", () => {
    const files = readdirSync(modelsDir).filter((name) => name.endsWith(".yaml"));
    expect(files.length).toBe(29);

    const counts: Record<string, number> = { current: 0, legacy: 0, experimental: 0 };
    for (const id of EXPECTED_IDS) {
      const doc = loadModel(id);
      counts[doc.status] = (counts[doc.status] ?? 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_STATUS_COUNTS);
  });

  it.each(EXPECTED_IDS)("%s validates against the model schema", (id) => {
    const doc = loadModel(id);
    expect(validateModel(doc, modelPath(id))).toEqual([]);
  });

  it.each(EXPECTED_IDS)("%s declares a lab", (id) => {
    const doc = loadModel(id);
    expect(typeof doc.lab).toBe("string");
    expect(doc.lab.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_IDS)("%s declares all six strength axes", (id) => {
    const doc = loadModel(id);
    expect(Object.keys(doc.strengths).sort()).toEqual([...STRENGTH_AXES].sort());
  });

  it.each(EXPECTED_IDS)("%s has non-empty evidence for every axis rated 3", (id) => {
    const doc = loadModel(id);
    const evidence = doc.evidence ?? {};
    for (const axis of STRENGTH_AXES) {
      if (doc.strengths[axis] === 3) {
        expect(evidence[axis]?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it.each(EXPECTED_IDS)("%s declares privacy fields", (id) => {
    const doc = loadModel(id);
    expect(typeof doc.privacy.trainsOnData).toBe("boolean");
    expect(
      doc.privacy.logRetentionDays === null ||
        typeof doc.privacy.logRetentionDays === "number",
    ).toBe(true);
  });

  it.each(EXPECTED_IDS)("%s declares a status", (id) => {
    const doc = loadModel(id);
    expect(["current", "legacy", "experimental"]).toContain(doc.status);
  });

  it.each(EXPECTED_IDS)("%s declares at least one effort variant", (id) => {
    const doc = loadModel(id);
    expect(doc.effortVariants.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_IDS)("%s has plans.go.verifiedAt", (id) => {
    const doc = loadModel(id);
    expect(doc.plans["go"]?.verifiedAt).toBe("2026-09-14");
  });

  it.each(EXPECTED_IDS)("%s declares an id matching its filename", (id) => {
    const doc = loadModel(id);
    expect(doc.id).toBe(id);
  });

  it("deepseek-v4.1-flash's promo multiplier does not change its derived Budget Class", () => {
    const subscription = readYamlFile(subscriptionPath, dataRoot) as SubscriptionDoc;
    expect(validateSubscription(subscription, subscriptionPath)).toEqual([]);
    const { thresholds } = subscription.budgetClass;

    const doc = loadModel("deepseek-v4.1-flash");
    const plan = doc.plans["go"];
    // The stored value MUST be the base cap (6,500), never the promo-scaled
    // 26,000 — the promo is recorded only via `multiplier`/`multiplierExpiresAt`.
    expect(plan?.requestsPer5h).toBe(6500);
    expect(plan?.multiplier).toBe(4);
    expect(plan?.multiplierExpiresAt).toBe("2026-09-20");

    const baseClass = deriveBudgetClass(plan?.requestsPer5h ?? null, thresholds);
    const promotedRequestsPer5h = (plan?.requestsPer5h ?? 0) * (plan?.multiplier ?? 1);
    const promotedClass = deriveBudgetClass(promotedRequestsPer5h, thresholds);

    // Derivation uses the base (non-promo) requestsPer5h stored on the plan,
    // never a value scaled by the temporary multiplier — so a promo never
    // re-tiers a model into a different Budget Class.
    expect(baseClass).toBe(promotedClass);
    expect(baseClass).toBe("volume");
  });

  // T10.2b (reopened T8.5): proves promo invariance where the cap is
  // actually selected — passes a synthetic promo-bearing model through the
  // real buildBundle pipeline (not two isolated deriveBudgetClass calls
  // over the same arguments, which could never fail) and asserts the
  // injected budgetClass comes from the base cap, entirely independent of
  // the live catalog. RED-first: before buildBundle existed, this test
  // failed to import it; that failure, and the failure of a deliberately
  // wrong "multiply the cap" implementation, were both observed (see the
  // slice 10 report).
  it("buildBundle injects the Budget Class derived from the base cap, never the promo-scaled one", () => {
    const syntheticThresholds: Threshold[] = [
      { class: "sniper", max: 199 },
      { class: "semi", max: 499 },
      { class: "workhorse", max: 5000 },
      { class: "volume", max: null },
    ];
    // 1,625 requests/5h is workhorse; the 4x-promoted 6,500 is volume — the
    // multiplier alone crosses a threshold, so a wrong implementation that
    // derives from the promoted figure is caught, not coincidentally equal.
    const syntheticSubscription: SubscriptionRecord = {
      id: "promo-fixture-sub",
      displayName: "Promo Fixture Subscription",
      providerPrefix: "promo-fixture-sub",
      billingModel: "capped",
      budgetClass: { derivedFrom: "requestsPer5h", thresholds: syntheticThresholds },
      catalogSourceUrl: "https://example.com/catalog",
      verifiedAt: "2026-09-17",
    };
    const syntheticModel: ModelRecord = {
      id: "promo-fixture-model",
      subscription: "promo-fixture-sub",
      displayName: "Promo Fixture Model",
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
          requestsPer5h: 1625,
          requestsPerWeek: 8000,
          requestsPerMonth: 32000,
          monthlyUsdBucket: 10,
          source: "https://example.com/catalog",
          verifiedAt: "2026-09-17",
          multiplier: 4,
          multiplierExpiresAt: "2099-01-01",
        },
      },
    };
    const dataSet: DataSet = {
      subscriptions: [syntheticSubscription],
      models: [syntheticModel],
      phases: [],
      overrides: [],
      runtimes: [],
    };

    const bundle = buildBundle(dataSet);
    const injectedBudgetClass = bundle.payload.models[0]?.plans["go"]?.budgetClass;

    expect(injectedBudgetClass).toBe("workhorse");
    expect(injectedBudgetClass).not.toBe(deriveBudgetClass(1625 * 4, syntheticThresholds));
  });

  // Every promo-bearing model actually in the catalog today (one carrying
  // `plans.go.multiplier`) must also keep the same derived Budget Class
  // before and after its promo — additional real-data assurance on top of
  // the buildBundle proof above. Skips explicitly, with a stated reason,
  // instead of quietly passing over zero iterations, once no catalog model
  // carries a multiplier any more (the deepseek-v4.1-flash promo above
  // ends 2026-09-20); the invariant itself no longer depends on this data
  // existing.
  const promoBearingIds = EXPECTED_IDS.filter((id) => {
    const doc = loadModel(id);
    return typeof doc.plans["go"]?.multiplier === "number";
  });

  it.skipIf(promoBearingIds.length === 0)(
    "every currently promo-bearing catalog model keeps its Budget Class across the promo",
    () => {
      const subscription = readYamlFile(subscriptionPath, dataRoot) as SubscriptionDoc;
      const { thresholds } = subscription.budgetClass;

      for (const id of promoBearingIds) {
        const doc = loadModel(id);
        const plan = doc.plans["go"];
        const baseClass = deriveBudgetClass(plan?.requestsPer5h ?? null, thresholds);
        const promotedRequestsPer5h = (plan?.requestsPer5h ?? 0) * (plan?.multiplier ?? 1);
        const promotedClass = deriveBudgetClass(promotedRequestsPer5h, thresholds);
        expect(baseClass).toBe(promotedClass);
      }
    },
  );

  // minimax-m2.5 has no numeric `requestsPer5h` on any plan (it is absent
  // from the live 5h/week/month caps table); the schema alone cannot reject
  // `status: current` for such a model, so this is enforced as a code check
  // in `validateModel` (see `checkCurrentRequiresCap` in validate.ts).
  it("minimax-m2.5 has no numeric requestsPer5h and is not status: current", () => {
    const doc = loadModel("minimax-m2.5");
    for (const plan of Object.values(doc.plans)) {
      expect(plan.requestsPer5h).toBeNull();
    }
    expect(doc.status).not.toBe("current");

    // The code check itself: a model with only null caps must be rejected
    // when marked current, naming the file and the offending field.
    const fabricatedCurrentDoc = { ...doc, status: "current" };
    const errors = validateModel(fabricatedCurrentDoc, modelPath("minimax-m2.5"));
    expect(errors).not.toEqual([]);
    expect(errors.some((error) => error.field === "status")).toBe(true);
  });

  it("muse-spark-1.2-contributor and muse-spark-1.3-contributor train on data with unpublished retention", () => {
    for (const id of ["muse-spark-1.2-contributor", "muse-spark-1.3-contributor"]) {
      const doc = loadModel(id);
      expect(doc.privacy.trainsOnData).toBe(true);
      expect(doc.privacy.logRetentionDays).toBeNull();
    }
  });
});

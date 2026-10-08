import type {
  BudgetClass,
  BundleModelPlan,
  BundleModelRecord,
  BundlePayload,
  SubscriptionRecord,
} from "@gentle-ai/profile-data";

/**
 * A small hand-written catalog: two Subscriptions, two Plans on `alpha`,
 * and models covering current and legacy status, every Budget Class that a
 * Phase call pattern cares about, an unknown cap, a model that trains on
 * data, and log retention of 0, 30, 90 days and unknown. Budget Classes are
 * written by hand here (the bundle derives them in production).
 */

function subscription(id: string, plans: string[]): SubscriptionRecord {
  return {
    id,
    displayName: id,
    providerPrefix: id,
    billingModel: "capped",
    budgetClass: {
      derivedFrom: "requestsPer5h",
      thresholds: [
        { class: "sniper", max: 199 },
        { class: "semi", max: 499 },
        { class: "workhorse", max: 5000 },
        { class: "volume", max: null },
      ],
    },
    plans: plans.map((plan) => ({ id: plan, displayName: plan })),
    catalogSourceUrl: "https://example.test/catalog",
    verifiedAt: "2026-01-01",
  };
}

function plan(requestsPer5h: number | null, budgetClass: BudgetClass | null): BundleModelPlan {
  return {
    requestsPer5h,
    requestsPerWeek: null,
    requestsPerMonth: null,
    monthlyUsdBucket: 10,
    source: "https://example.test/catalog",
    verifiedAt: "2026-01-01",
    budgetClass,
  };
}

function model(
  id: string,
  subscriptionId: string,
  overrides: Partial<BundleModelRecord>,
): BundleModelRecord {
  return {
    id,
    subscription: subscriptionId,
    displayName: id,
    lab: "lab-a",
    status: "current",
    strengths: {
      oneShotReasoning: 2,
      sustainedReasoning: 2,
      codingTools: 2,
      longContext: 2,
      multimodal: 0,
      cheap: 2,
    },
    privacy: { trainsOnData: false, logRetentionDays: 30 },
    effortVariants: [],
    plans: {},
    ...overrides,
  };
}

export const catalog: BundlePayload = {
  subscriptions: [subscription("alpha", ["basic", "pro"]), subscription("beta", ["standard"])],
  models: [
    model("sniper-one", "alpha", {
      plans: { basic: plan(150, "sniper"), pro: plan(150, "sniper") },
    }),
    model("work-horse", "alpha", {
      effortVariants: ["high"],
      privacy: { trainsOnData: false, logRetentionDays: 0 },
      plans: { basic: plan(1000, "workhorse"), pro: plan(1000, "workhorse") },
    }),
    model("old-timer", "alpha", {
      status: "legacy",
      plans: { basic: plan(1000, "workhorse"), pro: plan(1000, "workhorse") },
    }),
    model("trainer", "alpha", {
      lab: "lab-b",
      privacy: { trainsOnData: true, logRetentionDays: 30 },
      plans: { basic: plan(8000, "volume"), pro: plan(8000, "volume") },
    }),
    model("pro-only-unknown-cap", "alpha", {
      lab: "lab-b",
      privacy: { trainsOnData: false, logRetentionDays: null },
      plans: { pro: plan(null, null) },
    }),
    model("work-horse", "beta", {
      lab: "lab-c",
      privacy: { trainsOnData: false, logRetentionDays: 90 },
      plans: { standard: plan(300, "semi") },
    }),
  ],
  phases: [
    {
      id: "loop-phase",
      group: "test",
      callPattern: "loop",
      role: "neutral",
      weights: { oneShotReasoning: 1, sustainedReasoning: 1, codingTools: 1, longContext: 1, multimodal: 0, cheap: 1 },
    },
    {
      id: "one-shot-phase",
      group: "test",
      callPattern: "one-shot",
      role: "neutral",
      weights: { oneShotReasoning: 1, sustainedReasoning: 1, codingTools: 1, longContext: 1, multimodal: 0, cheap: 1 },
    },
  ],
  overrides: [],
  runtimes: [],
};

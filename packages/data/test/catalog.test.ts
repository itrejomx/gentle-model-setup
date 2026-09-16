import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deriveBudgetClass, readYamlFile, validateModel, validateSubscription } from "../src/index.js";
import type { Threshold } from "../src/types.js";

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

const EXPECTED_IDS: readonly string[] = [
  ...MOONSHOT_ZHIPU_XAI_OPENAI_IDS,
  ...ALIBABA_DEEPSEEK_IDS,
];

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

describe("opencode-go catalog — moonshot/zhipu/xai/openai slice", () => {
  it("has exactly the expected model files for this slice", () => {
    const files = readdirSync(modelsDir).filter((name) => name.endsWith(".yaml"));
    const ids = files.map((name) => name.replace(/\.yaml$/, "")).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
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
});

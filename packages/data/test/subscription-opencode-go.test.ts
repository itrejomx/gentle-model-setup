import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deriveBudgetClass, readYamlFile, validateSubscription } from "../src/index.js";
import type { Threshold } from "../src/types.js";

interface SubscriptionDoc {
  billingModel: string;
  budgetClass: { derivedFrom: string; thresholds: Threshold[] };
  plans: Array<{ id: string; displayName: string; priceUsdPerMonth?: number }>;
  catalogSourceUrl: string;
  verifiedAt: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(here, "../../../data");
const subscriptionPath = join(dataRoot, "subscriptions/opencode-go.yaml");

describe("opencode-go subscription file", () => {
  const doc = readYamlFile(subscriptionPath, dataRoot) as SubscriptionDoc;

  it("validates against the subscription schema", () => {
    expect(validateSubscription(doc, subscriptionPath)).toEqual([]);
  });

  it("declares a capped billing model", () => {
    expect(doc.billingModel).toBe("capped");
  });

  it("declares ascending thresholds: sniper<200, semi<500, workhorse<=5000, volume>5000", () => {
    expect(doc.budgetClass.derivedFrom).toBe("requestsPer5h");
    expect(doc.budgetClass.thresholds).toEqual([
      { class: "sniper", max: 199 },
      { class: "semi", max: 499 },
      { class: "workhorse", max: 5000 },
      { class: "volume", max: null },
    ]);
  });

  it("declares the go plan", () => {
    expect(doc.plans.map((plan) => plan.id)).toContain("go");
  });

  it("declares the catalog source URL and verification date", () => {
    expect(doc.catalogSourceUrl).toBe("https://opencode.ai/docs/go");
    expect(doc.verifiedAt).toBe("2026-09-14");
  });

  describe("deriveBudgetClass using the file's own thresholds", () => {
    it.each([
      [220, "semi"],
      [1350, "workhorse"],
    ] as const)("classifies %i requests/5h as %s", (requestsPer5h, expected) => {
      expect(deriveBudgetClass(requestsPer5h, doc.budgetClass.thresholds)).toBe(
        expected,
      );
    });
  });
});

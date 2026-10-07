import { describe, expect, it } from "vitest";
import { resolveEffort } from "../src/effort.js";
import { buildPool } from "../src/pool.js";
import type { Candidate, Tier } from "../src/types.js";
import { catalog } from "./fixtures/catalog.js";

const { candidates } = buildPool(catalog, {
  subscriptions: [
    { subscription: "alpha", plan: "pro" },
    { subscription: "beta", plan: "standard" },
  ],
  tier: "BALANCED",
  constraints: { clientCode: false },
});

function pick(id: string): Candidate {
  const found = candidates.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`fixture has no candidate ${id}`);
  return found;
}

describe("resolveEffort", () => {
  it("gives a workhorse that lists the high variant high effort in HIGH", () => {
    expect(resolveEffort(pick("alpha/work-horse"), "HIGH")).toEqual({
      effort: "high",
      reason: { code: "effort-high", params: { candidate: "alpha/work-horse", budgetClass: "workhorse" } },
    });
  });

  it("gives a sniper default effort in HIGH", () => {
    expect(resolveEffort(pick("alpha/sniper-one"), "HIGH")).toEqual({
      effort: "default",
      reason: { code: "effort-default", params: { candidate: "alpha/sniper-one", budgetClass: "sniper" } },
    });
  });

  it("keeps default effort for a workhorse without the variant, a semi, and a volume without it", () => {
    for (const id of ["alpha/trainer", "beta/work-horse", "alpha/pro-only-unknown-cap"]) {
      expect(resolveEffort(pick(id), "HIGH").effort, id).toBe("default");
    }
  });

  it("keeps default effort in BALANCED and LEAN even for a workhorse that lists the variant", () => {
    for (const tier of ["BALANCED", "LEAN"] as Tier[]) {
      const choice = resolveEffort(pick("alpha/work-horse"), tier);
      expect(choice.effort, tier).toBe("default");
      expect(choice.reason.code, tier).toBe("effort-default");
    }
  });

  it("gives a volume model that lists the variant high effort in HIGH", () => {
    const volume: Candidate = {
      ...pick("alpha/trainer"),
      model: { ...pick("alpha/trainer").model, effortVariants: ["high"] },
    };
    expect(resolveEffort(volume, "HIGH").effort).toBe("high");
  });

  it("never gives a sniper high effort even when it lists the variant", () => {
    const sniper: Candidate = {
      ...pick("alpha/sniper-one"),
      model: { ...pick("alpha/sniper-one").model, effortVariants: ["high"] },
    };
    expect(resolveEffort(sniper, "HIGH").effort).toBe("default");
  });
});

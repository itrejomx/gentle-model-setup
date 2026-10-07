import { describe, expect, it } from "vitest";
import { InvalidSelectionError } from "../src/errors.js";
import { buildPool } from "../src/pool.js";
import type { Selection } from "../src/types.js";
import { catalog } from "./fixtures/catalog.js";

function selection(overrides: Partial<Selection> = {}): Selection {
  return {
    subscriptions: [{ subscription: "alpha", plan: "basic" }],
    tier: "BALANCED",
    constraints: { clientCode: false },
    ...overrides,
  };
}

describe("buildPool", () => {
  it("offers current models on the selected Plan, under prefixed ids", () => {
    const { candidates } = buildPool(catalog, selection());
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "alpha/sniper-one",
      "alpha/work-horse",
      "alpha/trainer",
    ]);
  });
});

describe("buildPool plans", () => {
  it("offers a model only on the Plans it lists", () => {
    const basic = buildPool(catalog, selection()).candidates.map((candidate) => candidate.id);
    const pro = buildPool(catalog, selection({ subscriptions: [{ subscription: "alpha", plan: "pro" }] }))
      .candidates.map((candidate) => candidate.id);
    expect(basic).not.toContain("alpha/pro-only-unknown-cap");
    expect(pro).toContain("alpha/pro-only-unknown-cap");
  });

  it("drops legacy models", () => {
    const ids = buildPool(catalog, selection()).candidates.map((candidate) => candidate.id);
    expect(ids).not.toContain("alpha/old-timer");
  });

  it("yields two candidates for a model two selected Subscriptions offer", () => {
    const { candidates } = buildPool(
      catalog,
      selection({
        subscriptions: [
          { subscription: "alpha", plan: "basic" },
          { subscription: "beta", plan: "standard" },
        ],
      }),
    );
    const horses = candidates.filter((candidate) => candidate.model.id === "work-horse");
    expect(horses.map((candidate) => candidate.id)).toEqual(["alpha/work-horse", "beta/work-horse"]);
    expect(horses.map((candidate) => candidate.budgetClass)).toEqual(["workhorse", "semi"]);
  });
});

describe("buildPool clientCode", () => {
  it("prunes models that train on data, naming the constraint", () => {
    const { candidates, pruned } = buildPool(
      catalog,
      selection({ constraints: { clientCode: true } }),
    );
    expect(candidates.map((candidate) => candidate.id)).not.toContain("alpha/trainer");
    const trainer = pruned.find((candidate) => candidate.id === "alpha/trainer");
    expect(trainer?.reasons).toEqual([
      { code: "constraint-pruned", params: { candidate: "alpha/trainer", constraint: "clientCode" } },
    ]);
  });

  it("keeps models that train on data when client code is off", () => {
    const { candidates, pruned } = buildPool(catalog, selection());
    expect(candidates.map((candidate) => candidate.id)).toContain("alpha/trainer");
    expect(pruned).toEqual([]);
  });
});

describe("buildPool maxLogRetentionDays", () => {
  const both = selection({
    subscriptions: [
      { subscription: "alpha", plan: "pro" },
      { subscription: "beta", plan: "standard" },
    ],
  });

  function pool(maxLogRetentionDays: number) {
    return buildPool(catalog, { ...both, constraints: { clientCode: false, maxLogRetentionDays } });
  }

  it("prunes models whose retention exceeds the limit and keeps the boundary", () => {
    const { candidates, pruned } = pool(30);
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "alpha/sniper-one",
      "alpha/work-horse",
      "alpha/trainer",
    ]);
    const over = pruned.find((candidate) => candidate.id === "beta/work-horse");
    expect(over?.reasons).toEqual([
      { code: "constraint-pruned", params: { candidate: "beta/work-horse", constraint: "maxLogRetentionDays" } },
    ]);
    expect(over?.warnings).toEqual([]);
  });

  it("prunes unknown retention and warns on the pruned candidate", () => {
    const { candidates, pruned } = pool(30);
    expect(candidates.map((candidate) => candidate.id)).not.toContain("alpha/pro-only-unknown-cap");
    const unknown = pruned.find((candidate) => candidate.id === "alpha/pro-only-unknown-cap");
    expect(unknown?.reasons).toEqual([
      {
        code: "constraint-pruned",
        params: { candidate: "alpha/pro-only-unknown-cap", constraint: "maxLogRetentionDays" },
      },
    ]);
    expect(unknown?.warnings).toEqual([
      { code: "retention-unknown", params: { candidate: "alpha/pro-only-unknown-cap" } },
    ]);
  });

  it("keeps only zero-retention models at a limit of zero", () => {
    expect(pool(0).candidates.map((candidate) => candidate.id)).toEqual(["alpha/work-horse"]);
  });

  it("does not prune on retention when no limit is given", () => {
    const { candidates } = buildPool(catalog, both);
    expect(candidates.map((candidate) => candidate.id)).toContain("alpha/pro-only-unknown-cap");
  });

  it("applies every violated constraint to one pruned candidate", () => {
    const { pruned } = buildPool(catalog, {
      ...both,
      constraints: { clientCode: true, maxLogRetentionDays: 0 },
    });
    const trainer = pruned.find((candidate) => candidate.id === "alpha/trainer");
    expect(trainer?.reasons.map((reason) => reason.params)).toEqual([
      { candidate: "alpha/trainer", constraint: "clientCode" },
      { candidate: "alpha/trainer", constraint: "maxLogRetentionDays" },
    ]);
  });
});

describe("buildPool selection validation", () => {
  it("rejects a Subscription the payload does not hold, naming it", () => {
    expect(InvalidSelectionError).toBeTypeOf("function");
    const bad = selection({ subscriptions: [{ subscription: "gamma", plan: "basic" }] });
    expect(() => buildPool(catalog, bad)).toThrow(InvalidSelectionError);
    expect(() => buildPool(catalog, bad)).toThrow(/gamma/);
  });

  it("rejects a Plan the Subscription does not declare, naming the Subscription and the Plan", () => {
    for (const plan of ["enterprise", "constructor"]) {
      const bad = selection({ subscriptions: [{ subscription: "alpha", plan }] });
      expect(() => buildPool(catalog, bad)).toThrow(InvalidSelectionError);
      expect(() => buildPool(catalog, bad)).toThrow(new RegExp(`alpha.*${plan}`));
    }
  });

  it("rejects the same Subscription listed twice, on the same or different Plans", () => {
    for (const second of ["basic", "pro"]) {
      const bad = selection({
        subscriptions: [
          { subscription: "alpha", plan: "basic" },
          { subscription: "alpha", plan: second },
        ],
      });
      expect(() => buildPool(catalog, bad)).toThrow(InvalidSelectionError);
      expect(() => buildPool(catalog, bad)).toThrow(/alpha.*twice/);
    }
  });
});

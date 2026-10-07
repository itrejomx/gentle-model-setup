import type { BudgetClass } from "@gentle-ai/profile-data";
import { describe, expect, it } from "vitest";
import { budgetFitRank, filterByCallPattern } from "../src/budget.js";
import { UnknownCallPatternError } from "../src/errors.js";
import { buildPool } from "../src/pool.js";
import { catalog } from "./fixtures/catalog.js";

describe("budgetFitRank", () => {
  const loopRanks: [BudgetClass, number | null][] = [
    ["volume", 0],
    ["workhorse", 1],
    ["semi", 2],
    ["sniper", null],
  ];
  const oneShotRanks: [BudgetClass, number | null][] = [
    ["sniper", 0],
    ["semi", 1],
    ["workhorse", 2],
    ["volume", 3],
  ];

  it.each(loopRanks)("ranks %s for loop as %s", (budgetClass, rank) => {
    expect(budgetFitRank(budgetClass, "loop")).toBe(rank);
  });

  it.each(oneShotRanks)("ranks %s for one-shot as %s", (budgetClass, rank) => {
    expect(budgetFitRank(budgetClass, "one-shot")).toBe(rank);
  });

  it("gives an unknown Budget Class no rank for either call pattern", () => {
    expect(budgetFitRank(null, "loop")).toBeNull();
    expect(budgetFitRank(null, "one-shot")).toBeNull();
  });

  it("rejects an unrecognized call pattern", () => {
    expect(UnknownCallPatternError).toBeTypeOf("function");
    expect(() => budgetFitRank("volume", "burst")).toThrow(UnknownCallPatternError);
    expect(() => budgetFitRank("volume", "burst")).toThrow(/burst/);
  });
});

describe("filterByCallPattern", () => {
  const { candidates } = buildPool(catalog, {
    subscriptions: [{ subscription: "alpha", plan: "pro" }],
    tier: "BALANCED",
    constraints: { clientCode: false },
  });
  const ids = (list: { id: string }[]) => list.map((candidate) => candidate.id);

  it("excludes a sniper from a loop Phase with a budget-filter reason", () => {
    const { kept, excluded } = filterByCallPattern(candidates, "loop");
    expect(ids(kept)).not.toContain("alpha/sniper-one");
    const sniper = excluded.find((candidate) => candidate.id === "alpha/sniper-one");
    expect(sniper?.reasons).toEqual([
      {
        code: "budget-filter",
        params: { candidate: "alpha/sniper-one", budgetClass: "sniper", callPattern: "loop" },
      },
    ]);
  });

  it("excludes an unknown Budget Class from a loop Phase with a budget-unknown warning", () => {
    const { kept, excluded } = filterByCallPattern(candidates, "loop");
    expect(ids(kept)).not.toContain("alpha/pro-only-unknown-cap");
    const unknown = excluded.find((candidate) => candidate.id === "alpha/pro-only-unknown-cap");
    expect(unknown?.warnings).toEqual([
      { code: "budget-unknown", params: { candidate: "alpha/pro-only-unknown-cap" } },
    ]);
  });

  it("keeps an unknown Budget Class for a one-shot Phase, with a warning", () => {
    const { kept, excluded } = filterByCallPattern(candidates, "one-shot");
    expect(excluded).toEqual([]);
    const unknown = kept.find((candidate) => candidate.id === "alpha/pro-only-unknown-cap");
    expect(unknown?.warnings).toEqual([
      { code: "budget-unknown", params: { candidate: "alpha/pro-only-unknown-cap" } },
    ]);
  });

  it("keeps a sniper for a one-shot Phase", () => {
    expect(ids(filterByCallPattern(candidates, "one-shot").kept)).toContain("alpha/sniper-one");
  });

  it("rejects an unrecognized call pattern even for an empty pool", () => {
    expect(() => filterByCallPattern([], "burst")).toThrow(UnknownCallPatternError);
  });

  it("does not mutate the candidates it is given", () => {
    const before = structuredClone(candidates);
    filterByCallPattern(candidates, "loop");
    filterByCallPattern(candidates, "one-shot");
    expect(candidates).toEqual(before);
  });

  it("returns copies of kept candidates, so appending to one leaves the pool untouched", () => {
    const { kept } = filterByCallPattern(candidates, "one-shot");
    const copy = kept.find((candidate) => candidate.id === "alpha/work-horse");
    const original = candidates.find((candidate) => candidate.id === "alpha/work-horse");
    expect(copy).toBeDefined();
    expect(original).toBeDefined();
    expect(copy).not.toBe(original);
    copy?.reasons.push({ code: "pool-empty", params: { phase: "x" } });
    copy?.warnings.push({ code: "budget-unknown", params: { candidate: "x" } });
    expect(original?.reasons).toEqual([]);
    expect(original?.warnings).toEqual([]);
  });
});

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { deriveBudgetClass } from "../src/budget-class.js";
import type { BudgetClass, Threshold } from "../src/types.js";

const THRESHOLDS: Threshold[] = [
  { class: "sniper", max: 199 },
  { class: "semi", max: 499 },
  { class: "workhorse", max: 5000 },
  { class: "volume", max: null },
];

describe("deriveBudgetClass boundaries", () => {
  it.each([
    [199, "sniper"],
    [200, "semi"],
    [499, "semi"],
    [500, "workhorse"],
    [5000, "workhorse"],
    [5001, "volume"],
  ] satisfies Array<[number, BudgetClass]>)(
    "classifies %i requests/5h as %s",
    (requestsPer5h, expected) => {
      expect(deriveBudgetClass(requestsPer5h, THRESHOLDS)).toBe(expected);
    },
  );

  it("returns null for an unpublished (null) cap", () => {
    expect(deriveBudgetClass(null, THRESHOLDS)).toBeNull();
  });

  it("throws when thresholds do not ascend", () => {
    const descending: Threshold[] = [
      { class: "sniper", max: 100 },
      { class: "semi", max: 50 },
      { class: "volume", max: null },
    ];
    expect(() => deriveBudgetClass(150, descending)).toThrow(/ascend/);
  });
});

describe("deriveBudgetClass monotonicity property", () => {
  const RANK: Record<BudgetClass, number> = {
    sniper: 0,
    semi: 1,
    workhorse: 2,
    volume: 3,
  };

  it("never assigns a lower-ranked class to a higher requestsPer5h", () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.integer({ min: 1, max: 1_000_000 }), {
            minLength: 3,
            maxLength: 3,
          })
          .map((values) => [...values].sort((a, b) => a - b)),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (boundaries, reqA, reqB) => {
          const [sniperMax, semiMax, workhorseMax] = boundaries as [
            number,
            number,
            number,
          ];
          const thresholds: Threshold[] = [
            { class: "sniper", max: sniperMax },
            { class: "semi", max: semiMax },
            { class: "workhorse", max: workhorseMax },
            { class: "volume", max: null },
          ];
          const classA = deriveBudgetClass(reqA, thresholds);
          const classB = deriveBudgetClass(reqB, thresholds);
          if (classA === null || classB === null) return;

          const [lowerReq, higherReq] =
            reqA <= reqB ? [classA, classB] : [classB, classA];
          expect(RANK[lowerReq]).toBeLessThanOrEqual(RANK[higherReq]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

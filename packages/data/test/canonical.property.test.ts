import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hashPayload } from "../src/bundle.js";
import type { BundlePayload } from "../src/types.js";

/**
 * Builds one of the bundle's five id-bearing top-level collections: a
 * fixed, index-derived composite key (so items stay unique without
 * constraining what fast-check generates) plus one free-form scalar field
 * (`note`) fast-check varies across runs.
 */
function collectionArb(buildItem: (index: number, note: string) => Record<string, unknown>) {
  return fc
    .array(fc.string(), { minLength: 2, maxLength: 5 })
    .map((notes) => notes.map((note, index) => buildItem(index, note)));
}

const payloadArb = fc.record({
  subscriptions: collectionArb((index, note) => ({
    id: `sub-${index}`,
    displayName: `Subscription ${index}`,
    note,
  })),
  models: collectionArb((index, note) => ({
    id: `model-${index}`,
    subscription: `sub-${index % 2}`,
    note,
  })),
  phases: collectionArb((index, note) => ({ id: `phase-${index}`, note })),
  overrides: collectionArb((index, note) => ({
    tier: "HIGH",
    phase: `phase-${index}`,
    model: `model-${index}`,
    note,
  })),
  runtimes: collectionArb((index, note) => ({ id: `runtime-${index}`, note })),
});

function asPayload(value: unknown): BundlePayload {
  return value as BundlePayload;
}

/** Reverses the order of every top-level collection array, proving the
 * hash does not depend on the order those arrays were assembled in
 * (the bundle spec's concern: filesystem glob order varying between
 * runs). */
function reverseCollections(payload: Record<string, unknown[]>): Record<string, unknown[]> {
  const reversed: Record<string, unknown[]> = {};
  for (const [key, items] of Object.entries(payload)) {
    reversed[key] = [...items].reverse();
  }
  return reversed;
}

/** Rebuilds every object nested in `value` with its keys inserted in
 * reverse order. JS preserves string-key insertion order, so this is a
 * genuine structural change, not a no-op, proving the hash does not depend
 * on object key insertion order. */
function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const reversedEntries = [...entries]
      .reverse()
      .map(([key, nested]) => [key, reverseObjectKeys(nested)] as const);
    return Object.fromEntries(reversedEntries);
  }
  return value;
}

describe("canonical hash property (fast-check over a generated bundle payload)", () => {
  it("is unchanged by shuffling the top-level collection arrays' order", () => {
    fc.assert(
      fc.property(payloadArb, (payload) => {
        const original = hashPayload(asPayload(payload));
        const shuffled = reverseCollections(payload as unknown as Record<string, unknown[]>);
        expect(hashPayload(asPayload(shuffled))).toBe(original);
      }),
      { numRuns: 50 },
    );
  });

  it("is unchanged by reversing every object's key insertion order", () => {
    fc.assert(
      fc.property(payloadArb, (payload) => {
        const original = hashPayload(asPayload(payload));
        const keyReversed = reverseObjectKeys(payload);
        expect(hashPayload(asPayload(keyReversed))).toBe(original);
      }),
      { numRuns: 50 },
    );
  });

  it("changes when any scalar in the payload changes", () => {
    fc.assert(
      fc.property(payloadArb, fc.string(), (payload, replacementNote) => {
        const original = hashPayload(asPayload(payload));
        const mutated = JSON.parse(JSON.stringify(payload)) as typeof payload;
        const firstCollectionWithItems = Object.values(mutated).find(
          (items): items is Array<Record<string, unknown>> => Array.isArray(items) && items.length > 0,
        );
        fc.pre(firstCollectionWithItems !== undefined);
        const target = firstCollectionWithItems![0]!;
        fc.pre(target["note"] !== replacementNote);
        target["note"] = replacementNote;

        expect(hashPayload(asPayload(mutated))).not.toBe(original);
      }),
      { numRuns: 50 },
    );
  });
});

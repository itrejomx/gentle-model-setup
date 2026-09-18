import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hashPayload } from "../src/bundle.js";
import { canonicalJson } from "../src/canonical.js";
import type { BundlePayload } from "../src/types.js";

/**
 * A rich id suffix exercising mixed case, punctuation, digits, and
 * non-ASCII characters (T11.1): full Unicode graphemes, not just the plain
 * ASCII fast-check's default `fc.string()` mostly produces. Appended to an
 * index-derived prefix (see `collectionArb`) so ids stay unique — the
 * suffix's job is to stress the comparator, not to create ties (T11.2 owns
 * tie-breaking).
 */
const idSuffixArb = fc.string({ minLength: 0, maxLength: 6, unit: "grapheme" });

/**
 * Builds one of the bundle's five id-bearing top-level collections: a
 * fixed, index-derived composite key (so items stay unique without
 * constraining what fast-check generates) plus one free-form scalar field
 * (`note`) fast-check varies across runs, plus a rich id suffix (T11.1).
 */
function collectionArb(
  buildItem: (index: number, note: string, idSuffix: string) => Record<string, unknown>,
) {
  return fc
    .array(fc.tuple(fc.string(), idSuffixArb), { minLength: 2, maxLength: 5 })
    .map((entries) => entries.map(([note, idSuffix], index) => buildItem(index, note, idSuffix)));
}

const payloadArb = fc.record({
  subscriptions: collectionArb((index, note, idSuffix) => ({
    id: `sub-${index}-${idSuffix}`,
    displayName: `Subscription ${index}`,
    note,
  })),
  models: collectionArb((index, note, idSuffix) => ({
    id: `model-${index}-${idSuffix}`,
    subscription: `sub-${index % 2}`,
    note,
  })),
  phases: collectionArb((index, note, idSuffix) => ({ id: `phase-${index}-${idSuffix}`, note })),
  overrides: collectionArb((index, note, idSuffix) => ({
    tier: "HIGH",
    phase: `phase-${index}`,
    model: `model-${index}`,
    note: `${note}-${idSuffix}`,
  })),
  runtimes: collectionArb((index, note, idSuffix) => ({ id: `runtime-${index}-${idSuffix}`, note })),
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

  // T11.5: broadens the property above, which only ever mutated the first
  // non-empty collection's `note` field. This walks every leaf reachable
  // from the payload — including sort-key fields (`id`, `subscription`,
  // `tier`, `phase`, `model`) and collections beyond the first one with
  // items — and mutates one at random, proving the hash is sensitive to
  // every scalar, not just the one field the narrower test happened to pick.
  it("changes when any scalar leaf changes, including sort-key fields and later collections", () => {
    fc.assert(
      fc.property(payloadArb, fc.string(), fc.nat(), (payload, replacement, seed) => {
        const leafPaths = collectLeafPaths(payload);
        fc.pre(leafPaths.length > 0);
        const path = leafPaths[seed % leafPaths.length]!;
        const currentValue = readAtPath(payload, path);
        fc.pre(currentValue !== replacement);

        const original = hashPayload(asPayload(payload));
        const mutated = setAtPath(payload, path, replacement);
        expect(hashPayload(asPayload(mutated))).not.toBe(original);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Locale-independent canonical order (T11.1): `canonicalJson` MUST sort ids
 * by code unit, not by locale collation, since two different developer
 * machines (or CI) must agree on one order regardless of locale.
 */
describe("locale-independent canonical order (T11.1)", () => {
  it("orders ids by code unit, not by locale collation", () => {
    // Code-unit order: "B" (U+0042 = 66) < "_x" (U+005F = 95) < "a" (U+0061
    // = 97) < "b" (U+0062 = 98). English locale collation instead produces
    // ["_x", "a", "b", "B"] (case-insensitive primary order, punctuation
    // ignored) — a genuinely different order, proving the two comparisons
    // disagree rather than coincidentally matching.
    const payload = {
      subscriptions: [
        { id: "b", note: "n-b" },
        { id: "B", note: "n-B" },
        { id: "a", note: "n-a" },
        { id: "_x", note: "n-_x" },
      ],
      models: [],
      phases: [],
      overrides: [],
      runtimes: [],
    };

    const canonical = JSON.parse(canonicalJson(payload)) as {
      subscriptions: { id: string }[];
    };

    expect(canonical.subscriptions.map((subscription) => subscription.id)).toEqual([
      "B",
      "_x",
      "a",
      "b",
    ]);
  });
});

/**
 * Total order for collections (T11.2): a tied sort key (duplicated or
 * missing ids, or overrides sharing tier/phase/model) MUST NOT let input
 * order leak into the hash, collection reordering MUST stop at the
 * top-level collections (never recurse into a same-named nested array), and
 * a `null` collection item MUST NOT throw.
 */
describe("total order for collections (T11.2)", () => {
  it("never reorders an array reached through a nested key, even when it shares a name with a top-level collection", () => {
    const value = {
      subscriptions: [{ id: "b" }, { id: "a" }],
      wrapper: { models: [{ id: "z" }, { id: "a" }] },
    };

    const canonical = JSON.parse(canonicalJson(value)) as {
      subscriptions: { id: string }[];
      wrapper: { models: { id: string }[] };
    };

    // Top-level `subscriptions` is one of the five known collections: reordered.
    expect(canonical.subscriptions.map((item) => item.id)).toEqual(["a", "b"]);
    // `wrapper.models` merely shares the name `models`; it is not the
    // top-level collection, so its authored order is preserved.
    expect(canonical.wrapper.models.map((item) => item.id)).toEqual(["z", "a"]);
  });

  it("does not throw when a collection item is null", () => {
    const payload = asPayload({
      subscriptions: [null, { id: "a" }],
      models: [],
      phases: [],
      overrides: [],
      runtimes: [],
    });

    expect(() => hashPayload(payload)).not.toThrow();
  });

  it("breaks a tied sort key deterministically, so input order still does not change the hash", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (noteA, noteB) => {
        fc.pre(noteA !== noteB);
        const buildPayload = (first: string, second: string) =>
          asPayload({
            subscriptions: [
              { id: "tied", note: first },
              { id: "tied", note: second },
            ],
            models: [],
            phases: [],
            overrides: [],
            runtimes: [],
          });

        const inOrder = hashPayload(buildPayload(noteA, noteB));
        const swapped = hashPayload(buildPayload(noteB, noteA));
        expect(swapped).toBe(inOrder);
      }),
      { numRuns: 50 },
    );
  });

  it("breaks a tie between two items missing an id, so input order still does not change the hash", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (noteA, noteB) => {
        fc.pre(noteA !== noteB);
        const buildPayload = (first: string, second: string) =>
          asPayload({
            subscriptions: [{ note: first }, { note: second }],
            models: [],
            phases: [],
            overrides: [],
            runtimes: [],
          });

        const inOrder = hashPayload(buildPayload(noteA, noteB));
        const swapped = hashPayload(buildPayload(noteB, noteA));
        expect(swapped).toBe(inOrder);
      }),
      { numRuns: 50 },
    );
  });
});

/** Collects every scalar leaf's key-path in `value` (object keys and array
 * indices), depth-first. Used only to broaden the "changes when any scalar
 * changes" property (T11.5) over the whole payload instead of one
 * hand-picked field. */
function collectLeafPaths(value: unknown, path: (string | number)[] = []): (string | number)[][] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectLeafPaths(item, [...path, index]));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      collectLeafPaths(nested, [...path, key]),
    );
  }
  return path.length > 0 ? [path] : [];
}

function readAtPath(value: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>((acc, key) => (acc as Record<string | number, unknown>)[key], value);
}

/** Returns a copy of `value` with the leaf at `path` replaced by `newValue`,
 * without mutating `value` (T11.5). */
function setAtPath(value: unknown, path: (string | number)[], newValue: unknown): unknown {
  if (path.length === 0) return newValue;
  const [head, ...rest] = path as [string | number, ...(string | number)[]];
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[head as number] = setAtPath(copy[head as number], rest, newValue);
    return copy;
  }
  const record = { ...(value as Record<string | number, unknown>) };
  record[head] = setAtPath(record[head], rest, newValue);
  return record;
}

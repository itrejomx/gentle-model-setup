/**
 * The bundle's five id-bearing top-level collections. Each file under
 * `data/` contributes one element to one of these arrays, so their order
 * depends on filesystem glob order rather than on anything meaningful —
 * exactly the nondeterminism the bundle spec's "Canonical JSON before
 * hashing" requirement calls out. Every other array in the payload (a
 * model's `effortVariants`, a subscription's `budgetClass.thresholds`, an
 * override's `requires`, …) is authored in a single file in a deliberate
 * order and is left exactly as written. Reordering is deliberately limited
 * to these five *top-level* arrays (T11.2): a nested array that happens to
 * share one of these names (for example a `models` key buried inside some
 * other structure) is never reordered, only the payload's own five
 * properties are.
 */
const COLLECTION_SORT_KEYS: Record<string, (item: Record<string, unknown>) => string[]> = {
  subscriptions: (item) => [sortKeyPart(item["id"])],
  models: (item) => [sortKeyPart(item["subscription"]), sortKeyPart(item["id"])],
  phases: (item) => [sortKeyPart(item["id"])],
  runtimes: (item) => [sortKeyPart(item["id"])],
  overrides: (item) => [
    sortKeyPart(item["tier"]),
    sortKeyPart(item["phase"]),
    sortKeyPart(item["model"]),
  ],
};

function sortKeyPart(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

/**
 * Ordinary code-unit comparison (`<`/`>` on strings), never `localeCompare`
 * (T11.1). `localeCompare` is locale-dependent and, worse, can treat two
 * genuinely different strings as equal — for example a precomposed
 * accented character versus its decomposed combining-mark form — which
 * would make a stable sort's output depend on the two items' original
 * relative order instead of on a total, input-order-independent order.
 */
function compareCodeUnits(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compareSortKeys(a: string[], b: string[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const result = compareCodeUnits(a[index] ?? "", b[index] ?? "");
    if (result !== 0) return result;
  }
  return 0;
}

/** The sort key for a collection item that may not even be an object (a
 * malformed `null` entry, say): such an item sorts as if every key part
 * were empty, and is never allowed to throw (T11.2). */
function computeSortKey(
  item: unknown,
  sortKeyFor: (item: Record<string, unknown>) => string[],
): string[] {
  if (item === null || typeof item !== "object") return [];
  return sortKeyFor(item as Record<string, unknown>);
}

/**
 * Sorts one top-level collection into a total order: primarily by its
 * composite sort key, then — when two or more items tie on that key (a
 * duplicated or missing id, two overrides sharing tier/phase/model, or two
 * malformed `null` items) — by the item's own canonical JSON, so the
 * result no longer depends on which order the items arrived in (T11.2).
 * Items that are fully identical even after that tie-break keep their
 * original relative order, which is harmless: swapping two identical items
 * never changes the array's serialized form.
 */
function sortCollection(
  items: unknown[],
  sortKeyFor: (item: Record<string, unknown>) => string[],
): unknown[] {
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const primary = compareSortKeys(
        computeSortKey(left.item, sortKeyFor),
        computeSortKey(right.item, sortKeyFor),
      );
      if (primary !== 0) return primary;

      const tieBreak = compareCodeUnits(JSON.stringify(left.item), JSON.stringify(right.item));
      if (tieBreak !== 0) return tieBreak;

      return left.originalIndex - right.originalIndex;
    })
    .map(({ item }) => item);
}

/**
 * Recursively canonicalizes `value` for use *inside* one of the payload's
 * five top-level collections, or anywhere else that is not itself one of
 * those five properties: every object's keys are sorted lexicographically,
 * but no array is ever reordered here, regardless of what key it was
 * reached through. Reordering only ever happens once, at the top level
 * (see {@link canonicalizeRoot}), which is what keeps a nested `models` (or
 * any other collection name) array's authored order intact (T11.2).
 */
function canonicalizeNested(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeNested(item));
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort(compareCodeUnits);
    const canonicalObject: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      canonicalObject[key] = canonicalizeNested(record[key]);
    }
    return canonicalObject;
  }
  return value;
}

/**
 * Canonicalizes the payload's own top-level object: object keys sorted
 * lexicographically as usual, but each of the five id-bearing properties
 * (`subscriptions`, `models`, `phases`, `overrides`, `runtimes`) that is
 * itself an array is additionally reordered by its composite sort key. Any
 * other top-level value (or a non-object payload) is handled exactly like
 * a nested value, since reordering never applies below this one level.
 */
function canonicalizeRoot(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return canonicalizeNested(value);
  }
  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort(compareCodeUnits);
  const canonicalObject: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const propertyValue = record[key];
    const sortKeyFor = COLLECTION_SORT_KEYS[key];
    if (Array.isArray(propertyValue) && sortKeyFor) {
      const canonicalizedItems = propertyValue.map((item) => canonicalizeNested(item));
      canonicalObject[key] = sortCollection(canonicalizedItems, sortKeyFor);
    } else {
      canonicalObject[key] = canonicalizeNested(propertyValue);
    }
  }
  return canonicalObject;
}

/**
 * Serializes `value` to a canonical JSON string: object keys sorted by
 * code unit at every level, and the bundle's five id-bearing top-level
 * collections reordered by composite key — with a deterministic tie-break
 * for tied keys — so their order no longer depends on filesystem glob
 * order or on which order tied items were authored in. No other array, and
 * no array below the top level, is ever reordered. See the data-bundle
 * spec's "Canonical JSON before hashing" requirement.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeRoot(value));
}

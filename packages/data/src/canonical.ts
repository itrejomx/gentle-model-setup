/**
 * The bundle's five id-bearing top-level collections. Each file under
 * `data/` contributes one element to one of these arrays, so their order
 * depends on filesystem glob order rather than on anything meaningful —
 * exactly the nondeterminism the bundle spec's "Canonical JSON before
 * hashing" requirement calls out. Every other array in the payload (a
 * model's `effortVariants`, a subscription's `budgetClass.thresholds`, an
 * override's `requires`, …) is authored in a single file in a deliberate
 * order and is left exactly as written.
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

function compareSortKeys(a: string[], b: string[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const result = (a[index] ?? "").localeCompare(b[index] ?? "");
    if (result !== 0) return result;
  }
  return 0;
}

/**
 * Recursively canonicalizes `value`: every object's keys are sorted
 * lexicographically, and an array reached through one of the known
 * collection keys is reordered by that collection's composite sort key.
 * `parentKey` is the property name `value` was reached through, which is
 * how a collection array is told apart from an ordinary one.
 */
function canonicalize(value: unknown, parentKey: string | undefined): unknown {
  if (Array.isArray(value)) {
    const canonicalizedItems = value.map((item) => canonicalize(item, undefined));
    const sortKeyFor = parentKey ? COLLECTION_SORT_KEYS[parentKey] : undefined;
    if (!sortKeyFor) return canonicalizedItems;
    return [...canonicalizedItems].sort((a, b) =>
      compareSortKeys(sortKeyFor(a as Record<string, unknown>), sortKeyFor(b as Record<string, unknown>)),
    );
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const canonicalObject: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      canonicalObject[key] = canonicalize(record[key], key);
    }
    return canonicalObject;
  }
  return value;
}

/**
 * Serializes `value` to a canonical JSON string: object keys sorted
 * lexicographically at every level, and the bundle's five id-bearing
 * top-level collections reordered by composite key so their order no
 * longer depends on filesystem glob order. No other array is reordered.
 * See the data-bundle spec's "Canonical JSON before hashing" requirement.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value, undefined));
}

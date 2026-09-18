import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildBundle, DataValidationError, loadData, validateData } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(here, "../../../data");

/**
 * Assembles a real DataSet from the committed `data/` tree (T10.13 gap):
 * every earlier test hand-builds a DataSet in memory, so `buildBundle`
 * had never actually run against what `pnpm build` would load on disk.
 */
describe("loadData over the committed data/ tree (T10.13)", () => {
  it("assembles the documented collection counts", async () => {
    const dataSet = await loadData(dataRoot);

    // Counts per the acceptance criteria: 1 subscription, 29 catalog
    // models, 27 canonical phases, 4 runtime mappings, and 0 overrides
    // (this change ships no override data — bundle spec, "Overrides
    // collection is empty in this change"; data/overrides/ does not even
    // exist yet).
    expect(dataSet.subscriptions.length).toBe(1);
    expect(dataSet.models.length).toBe(29);
    expect(dataSet.phases.length).toBe(27);
    expect(dataSet.runtimes.length).toBe(4);
    expect(dataSet.overrides.length).toBe(0);
  });

  it("validateData returns no errors for the committed tree", async () => {
    expect(await validateData(dataRoot)).toEqual([]);
  });

  it("buildBundle accepts the loaded DataSet and produces a stable hash across two loads", async () => {
    const first = buildBundle(await loadData(dataRoot));
    const second = buildBundle(await loadData(dataRoot));

    expect(first.hash).toBe(second.hash);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("loadData aggregation and containment over a temp data root", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "gentle-ai-load-data-"));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("aggregates errors from multiple invalid files across different collections instead of failing fast", async () => {
    await mkdir(join(rootDir, "subscriptions"), { recursive: true });
    // Wrong type for `id` (schema requires a string).
    await writeFile(join(rootDir, "subscriptions", "bad.yaml"), "id: 123\n", "utf8");
    await mkdir(join(rootDir, "runtimes"), { recursive: true });
    // Wrong type for `id` on a second, unrelated collection.
    await writeFile(join(rootDir, "runtimes", "bad.yaml"), "id: []\n", "utf8");

    await expect(loadData(rootDir)).rejects.toThrow(DataValidationError);

    const errors = await validateData(rootDir);
    const files = new Set(errors.map((error) => error.file));
    expect([...files].some((file) => file.includes("subscriptions"))).toBe(true);
    expect([...files].some((file) => file.includes("runtimes"))).toBe(true);
  });

  it("treats a missing overrides directory as zero overrides, not an error", async () => {
    await mkdir(join(rootDir, "subscriptions"), { recursive: true });
    await mkdir(join(rootDir, "models"), { recursive: true });
    await mkdir(join(rootDir, "phases"), { recursive: true });
    // The phases schema requires at least one row (`minItems: 1`), so an
    // empty phases.yaml is itself invalid; one minimal valid row keeps this
    // fixture's only variable under test the missing overrides/ directory.
    await writeFile(
      join(rootDir, "phases", "phases.yaml"),
      [
        "phases:",
        "  - id: fixture-phase",
        "    group: workers",
        "    callPattern: one-shot",
        "    role: neutral",
        "    weights: { oneShotReasoning: 1, sustainedReasoning: 0, codingTools: 0, longContext: 0, multimodal: 0, cheap: 0 }",
        "",
      ].join("\n"),
      "utf8",
    );
    await mkdir(join(rootDir, "runtimes"), { recursive: true });
    // deliberately no `overrides/` directory

    const dataSet = await loadData(rootDir);
    expect(dataSet.overrides).toEqual([]);
  });
});

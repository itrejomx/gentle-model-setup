import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BundleHashMismatchError,
  BundleParseError,
  BundleShapeError,
  buildBundle,
  DataValidationError,
  loadBundle,
} from "../src/index.js";
import type { DataSet } from "../src/types.js";

function fixtureDataSet(): DataSet {
  return {
    subscriptions: [
      {
        id: "fixture-sub",
        displayName: "Fixture Subscription",
        providerPrefix: "fixture-sub",
        billingModel: "capped",
        budgetClass: {
          derivedFrom: "requestsPer5h",
          thresholds: [
            { class: "sniper", max: 199 },
            { class: "semi", max: 499 },
            { class: "workhorse", max: 5000 },
            { class: "volume", max: null },
          ],
        },
        plans: [{ id: "go", displayName: "Go" }],
        catalogSourceUrl: "https://example.com/catalog",
        verifiedAt: "2026-09-14",
      },
    ],
    models: [
      {
        id: "fixture-model",
        subscription: "fixture-sub",
        displayName: "Fixture Model",
        lab: "moonshot",
        status: "current",
        strengths: {
          oneShotReasoning: 1,
          sustainedReasoning: 1,
          codingTools: 1,
          longContext: 1,
          multimodal: 0,
          cheap: 1,
        },
        privacy: { trainsOnData: false, logRetentionDays: 0 },
        effortVariants: ["medium"],
        plans: {
          go: {
            requestsPer5h: 1350,
            requestsPerWeek: 6500,
            requestsPerMonth: 26000,
            monthlyUsdBucket: 10,
            source: "https://example.com/catalog",
            verifiedAt: "2026-09-14",
          },
        },
      },
    ],
    phases: [],
    overrides: [],
    runtimes: [],
  };
}

describe("bundle integration (buildBundle -> write -> loadBundle)", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "gentle-ai-bundle-"));
    file = join(dir, "data.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips: buildBundle's output loads back unchanged and re-verified", async () => {
    const built = buildBundle(fixtureDataSet());
    await writeFile(file, JSON.stringify(built), "utf8");

    const loaded = await loadBundle(file);

    expect(loaded.hash).toBe(built.hash);
    expect(loaded.payload).toEqual(built.payload);
    // 1,350 requests/5h is workhorse per the fixture thresholds (<=5000);
    // confirms buildBundle actually injected a derived Budget Class.
    expect(loaded.payload.models[0]?.plans["go"]?.budgetClass).toBe("workhorse");
  });

  it("rejects a bundle whose payload was tampered with after the build", async () => {
    const built = buildBundle(fixtureDataSet());
    const raw = JSON.stringify(built);
    // Flips one byte inside the hashed payload, without touching the
    // stored `hash`, simulating a post-build edit (bundle spec: "a
    // tampered bundle is rejected").
    const tampered = raw.replace('"Fixture Model"', '"Fixture Model!"');
    expect(tampered).not.toBe(raw);
    await writeFile(file, tampered, "utf8");

    await expect(loadBundle(file)).rejects.toThrow(BundleHashMismatchError);
  });
});

describe("buildBundle rejects an integrity failure instead of building a degraded bundle", () => {
  // T11.3: previously, `injectBudgetClasses` fell back to an empty
  // threshold list for a model whose `subscription` did not resolve,
  // silently producing `budgetClass: null` (or an untyped `Error` from
  // `deriveBudgetClass`) instead of the aggregated, typed
  // `DataValidationError` buildBundle's cross-file check is supposed to
  // produce for every other integrity failure.
  it("throws DataValidationError for a model whose subscription does not resolve, never a degraded bundle", () => {
    const dataSet = fixtureDataSet();
    dataSet.models[0]!.subscription = "no-such-subscription";

    expect(() => buildBundle(dataSet)).toThrow(DataValidationError);
  });

  // T11.5: proves the throw above is not a tautology. Temporarily removing
  // `buildBundle`'s `if (integrityErrors.length > 0) throw ...` guard (see
  // the slice 11 report for the exact mutation and the observed failure)
  // made this assertion fail instead of passing for an unrelated reason,
  // confirming the test genuinely depends on that guard.
  it("throws DataValidationError for a non-empty runtime whose agentMap targets a dangling phase id", () => {
    const dataSet = fixtureDataSet();
    dataSet.runtimes = [
      {
        id: "fixture-runtime",
        displayName: "Fixture Runtime",
        agentMap: { "some-agent": "no-such-phase" },
        prefixMap: { "fixture-sub": "fixture-sub" },
      },
    ];

    expect(() => buildBundle(dataSet)).toThrow(DataValidationError);
  });
});

/**
 * loadBundle shape validation (T11.4): a malformed JSON file, a bundle
 * missing `payload`, one missing `hash`, and one where either field has
 * the wrong type all raise a typed bundle error, each distinct from
 * BundleHashMismatchError (which means the shape was fine but the hash
 * itself did not match).
 */
describe("loadBundle shape validation (T11.4)", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "gentle-ai-bundle-shape-"));
    file = join(dir, "data.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("rejects a file that is not valid JSON", async () => {
    await writeFile(file, "{ not valid json", "utf8");

    await expect(loadBundle(file)).rejects.toThrow(BundleParseError);
  });

  it("rejects a bundle missing the payload field", async () => {
    await writeFile(file, JSON.stringify({ hash: "deadbeef" }), "utf8");

    await expect(loadBundle(file)).rejects.toThrow(BundleShapeError);
  });

  it("rejects a bundle missing the hash field", async () => {
    await writeFile(
      file,
      JSON.stringify({
        payload: { subscriptions: [], models: [], phases: [], overrides: [], runtimes: [] },
      }),
      "utf8",
    );

    await expect(loadBundle(file)).rejects.toThrow(BundleShapeError);
  });

  it("rejects a bundle whose hash field has the wrong type", async () => {
    await writeFile(
      file,
      JSON.stringify({
        hash: 12345,
        payload: { subscriptions: [], models: [], phases: [], overrides: [], runtimes: [] },
      }),
      "utf8",
    );

    await expect(loadBundle(file)).rejects.toThrow(BundleShapeError);
  });

  it("rejects a bundle whose payload field has the wrong type", async () => {
    await writeFile(file, JSON.stringify({ hash: "deadbeef", payload: "not-an-object" }), "utf8");

    await expect(loadBundle(file)).rejects.toThrow(BundleShapeError);
  });

  it("still reports a hash mismatch, not a shape error, once the shape itself is valid", async () => {
    await writeFile(
      file,
      JSON.stringify({
        hash: "not-the-real-hash",
        payload: { subscriptions: [], models: [], phases: [], overrides: [], runtimes: [] },
      }),
      "utf8",
    );

    await expect(loadBundle(file)).rejects.toThrow(BundleHashMismatchError);
  });
});

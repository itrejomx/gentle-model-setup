import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BundleHashMismatchError, buildBundle, loadBundle } from "../src/index.js";
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

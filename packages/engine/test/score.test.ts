import type { PhaseRecord } from "@gentle-ai/profile-data";
import { describe, expect, it } from "vitest";
import { AXES, cheapMultiplier, score, scoreReason, tierReason, tierWeights } from "../src/score.js";
import type { Candidate } from "../src/types.js";
import { makeCandidate } from "./fixtures/candidate.js";

function phase(weights: Record<string, number>): PhaseRecord {
  return { id: "p", group: "test", callPattern: "loop", role: "neutral", weights };
}

function candidate(id: string, strengths: Record<string, number>): Candidate {
  return makeCandidate({ id, strengths });
}

const even = phase({ oneShotReasoning: 0.2, sustainedReasoning: 0.2, codingTools: 0.2, longContext: 0.2, multimodal: 0, cheap: 0.2 });
const quality = { oneShotReasoning: 2, sustainedReasoning: 2, codingTools: 2, longContext: 2, multimodal: 0 };

describe("score", () => {
  it("prefers the cheaper of two equal-quality models in LEAN", () => {
    const pricey = candidate("a/pricey", { ...quality, cheap: 0 });
    const thrifty = candidate("a/thrifty", { ...quality, cheap: 3 });
    expect(score(thrifty, even, "LEAN")).toBeGreaterThan(score(pricey, even, "LEAN"));
  });

  it("lets LEAN trade quality for cheapness where BALANCED does not", () => {
    const strong = candidate("a/strong", { oneShotReasoning: 3, sustainedReasoning: 3, codingTools: 3, longContext: 3, multimodal: 0, cheap: 0 });
    const thrifty = candidate("a/thrifty", { oneShotReasoning: 2, sustainedReasoning: 2, codingTools: 2, longContext: 2, multimodal: 0, cheap: 3 });
    expect(score(strong, even, "BALANCED")).toBeGreaterThan(score(thrifty, even, "BALANCED"));
    expect(score(thrifty, even, "LEAN")).toBeGreaterThan(score(strong, even, "LEAN"));
  });

  it("ignores the cheap Strength in HIGH", () => {
    const pricey = candidate("a/pricey", { ...quality, cheap: 0 });
    const thrifty = candidate("a/thrifty", { ...quality, cheap: 3 });
    expect(score(thrifty, even, "HIGH")).toBe(score(pricey, even, "HIGH"));
  });

  it("uses the authored weights in BALANCED", () => {
    const model = candidate("a/m", { oneShotReasoning: 3, sustainedReasoning: 1, codingTools: 2, longContext: 0, multimodal: 3, cheap: 1 });
    const authored = phase({ oneShotReasoning: 0.4, sustainedReasoning: 0.2, codingTools: 0.2, longContext: 0.1, multimodal: 0, cheap: 0.1 });
    const expected = 0.4 * 3 + 0.2 * 1 + 0.2 * 2 + 0.1 * 0 + 0 * 3 + 0.1 * 1;
    expect(score(model, authored, "BALANCED")).toBeCloseTo(expected, 12);
  });

  it("renormalizes the weights to sum to 1 at every Tier, even for unnormalized input", () => {
    for (const weights of [even.weights, { codingTools: 3, cheap: 1 }, { oneShotReasoning: 5, cheap: 5 }]) {
      for (const tier of ["HIGH", "BALANCED", "LEAN"] as const) {
        const total = AXES.reduce((sum, axis) => sum + (tierWeights(phase(weights), tier)[axis] ?? 0), 0);
        expect(Math.abs(total - 1), `${tier} ${JSON.stringify(weights)}`).toBeLessThan(1e-9);
      }
    }
  });

  it("scales only the cheap weight, by the Tier multiplier, before renormalizing", () => {
    const raw = phase({ codingTools: 0.5, cheap: 0.5 });
    expect([cheapMultiplier("HIGH"), cheapMultiplier("BALANCED"), cheapMultiplier("LEAN")]).toEqual([0, 1, 3]);
    expect(tierWeights(raw, "HIGH")["cheap"]).toBe(0);
    expect(tierWeights(raw, "BALANCED")["cheap"]).toBeCloseTo(0.5, 12);
    expect(tierWeights(raw, "LEAN")["cheap"]).toBeCloseTo(1.5 / 2, 12);
    expect(tierWeights(raw, "LEAN")["codingTools"]).toBeCloseTo(0.5 / 2, 12);
  });

  it("counts a missing Strength axis as 0 and scores 0 when every weight is 0", () => {
    const sparse = candidate("a/sparse", { codingTools: 3 });
    expect(score(sparse, phase({ codingTools: 1 }), "BALANCED")).toBe(3);
    expect(score(sparse, phase({ cheap: 1 }), "HIGH")).toBe(0);
  });

  it("reports the score, the Tier, its multiplier, and the resulting cheap weight as params", () => {
    const model = candidate("a/m", { ...quality, cheap: 3 });
    const value = score(model, even, "LEAN");
    expect(scoreReason(model, value)).toEqual({ code: "strength-score", params: { candidate: "a/m", score: value } });
    expect(tierReason(even, "LEAN")).toEqual({
      code: "tier-applied",
      params: { tier: "LEAN", multiplier: 3, cheapWeight: tierWeights(even, "LEAN")["cheap"] },
    });
  });
});

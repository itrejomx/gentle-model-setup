import { describe, expect, it } from "vitest";
import { rankCandidates } from "../src/rank.js";
import { makeCandidate, makePhase } from "./fixtures/candidate.js";

const weights = { oneShotReasoning: 0.25, sustainedReasoning: 0.25, codingTools: 0.25, longContext: 0.25, multimodal: 0, cheap: 0 };
const oneShot = makePhase("one-shot", weights);
const loop = makePhase("loop", weights);
const none = new Map<string, number>();
const ids = (ranked: { candidate: { id: string } }[]) => ranked.map((entry) => entry.candidate.id);

describe("rankCandidates", () => {
  it("puts the higher score first", () => {
    const low = makeCandidate({ id: "a/low", strengths: { codingTools: 1 } });
    const high = makeCandidate({ id: "a/high", strengths: { codingTools: 3 } });
    const { ranked } = rankCandidates([low, high], oneShot, "BALANCED", none);
    expect(ids(ranked)).toEqual(["a/high", "a/low"]);
    expect(ranked.map((entry) => entry.score)).toEqual([0.75, 0.25]);
  });

  it("breaks a score tie by Budget Class fit for the call pattern, an unranked class last", () => {
    const make = (id: string, budgetClass: "sniper" | "semi" | "workhorse" | "volume" | null) =>
      makeCandidate({ id, budgetClass });
    const pool = [make("a/null", null), make("a/volume", "volume"), make("a/sniper", "sniper"), make("a/semi", "semi")];
    expect(ids(rankCandidates(pool, oneShot, "BALANCED", none).ranked)).toEqual(["a/sniper", "a/semi", "a/volume", "a/null"]);
    const loopPool = [make("a/null", null), make("a/semi", "semi"), make("a/volume", "volume")];
    expect(ids(rankCandidates(loopPool, loop, "BALANCED", none).ranked)).toEqual(["a/volume", "a/semi", "a/null"]);
  });

  it("then prefers the higher cheap Strength", () => {
    // HIGH ignores `cheap` in the score, so the two tie on score and fit.
    const strengths = (cheap: number) => ({ ...{ codingTools: 2, oneShotReasoning: 2, sustainedReasoning: 2, longContext: 2, multimodal: 0 }, cheap });
    const pool = [makeCandidate({ id: "a/dear", strengths: strengths(0) }), makeCandidate({ id: "a/cheap", strengths: strengths(3) })];
    expect(ids(rankCandidates(pool, oneShot, "HIGH", none).ranked)).toEqual(["a/cheap", "a/dear"]);
  });

  it("orders candidates tied on score, fit, and cheap by prefixed id, never by a raw cap", () => {
    const withCap = (id: string, requestsPer5h: number | null) => {
      const base = makeCandidate({ id });
      return { ...base, plan: { ...base.plan, requestsPer5h } };
    };
    const pool = [withCap("a/b", 4000), withCap("a/a", null), withCap("a/c", 300)];
    expect(ids(rankCandidates(pool, oneShot, "BALANCED", none).ranked)).toEqual(["a/a", "a/b", "a/c"]);
  });

  it("finally orders by prefixed id ascending, whatever the input order", () => {
    const pool = ["a/c", "a/a", "b/a", "a/b"].map((id) => makeCandidate({ id }));
    const expected = ["a/a", "a/b", "a/c", "b/a"];
    expect(ids(rankCandidates(pool, oneShot, "BALANCED", none).ranked)).toEqual(expected);
    expect(ids(rankCandidates([...pool].reverse(), oneShot, "BALANCED", none).ranked)).toEqual(expected);
  });
});

describe("rankCandidates duplicate Subscriptions", () => {
  const dup = (subscription: string, extra: Parameters<typeof makeCandidate>[0] = {}) =>
    makeCandidate({ subscription, modelId: "shared", ...extra });

  it("prefers the better Budget Class fit for the call pattern", () => {
    const pool = [dup("x", { budgetClass: "workhorse" }), dup("y", { budgetClass: "volume" })];
    const { ranked, reasons } = rankCandidates(pool, loop, "BALANCED", none);
    expect(ids(ranked)).toEqual(["y/shared", "x/shared"]);
    expect(reasons).toEqual([
      { code: "duplicate-tiebreak", params: { kept: "y/shared", dropped: "x/shared", rule: "budget-class" } },
    ]);
  });

  it("then prefers a capped Subscription over a metered one, ahead of the id order", () => {
    const pool = [dup("x", { billingModel: "metered" }), dup("y", { billingModel: "capped" })];
    const { ranked, reasons } = rankCandidates(pool, loop, "BALANCED", none);
    expect(ids(ranked)).toEqual(["y/shared", "x/shared"]);
    expect(reasons).toEqual([
      { code: "duplicate-tiebreak", params: { kept: "y/shared", dropped: "x/shared", rule: "capped-over-metered" } },
    ]);
  });

  it("then prefers the Subscription already holding more rows in this Profile", () => {
    const pool = [dup("x"), dup("y")];
    const held = new Map([["x", 1], ["y", 3]]);
    const { ranked, reasons } = rankCandidates(pool, loop, "BALANCED", held);
    expect(ids(ranked)).toEqual(["y/shared", "x/shared"]);
    expect(reasons).toEqual([
      { code: "duplicate-tiebreak", params: { kept: "y/shared", dropped: "x/shared", rule: "subscription-rows" } },
    ]);
  });

  it("moves the best of three duplicates to the top, not just the better of the first two", () => {
    const pool = [dup("x", { billingModel: "metered" }), dup("y", { billingModel: "capped" }), dup("z", { billingModel: "capped" })];
    const { ranked, reasons } = rankCandidates(pool, loop, "BALANCED", none);
    expect(ids(ranked)).toEqual(["y/shared", "x/shared", "z/shared"]);
    expect(reasons).toEqual([
      { code: "duplicate-tiebreak", params: { kept: "y/shared", dropped: "x/shared", rule: "capped-over-metered" } },
    ]);
  });

  it("weighs billing model before rows held", () => {
    const pool = [dup("x", { billingModel: "metered" }), dup("y", { billingModel: "capped" })];
    const held = new Map([["x", 5], ["y", 0]]);
    expect(ids(rankCandidates(pool, loop, "BALANCED", held).ranked)).toEqual(["y/shared", "x/shared"]);
  });

  it("falls back to the general order, with no reason, when the duplicates are indistinguishable", () => {
    const { ranked, reasons } = rankCandidates([dup("y"), dup("x")], loop, "BALANCED", none);
    expect(ids(ranked)).toEqual(["x/shared", "y/shared"]);
    expect(reasons).toEqual([]);
  });

  it("applies only when the duplicates tie at the top on score", () => {
    const strong = { codingTools: 3, oneShotReasoning: 3, sustainedReasoning: 3, longContext: 3, multimodal: 0, cheap: 0 };
    const pool = [dup("x", { billingModel: "metered" }), dup("y", { billingModel: "capped" }), makeCandidate({ id: "z/strong", strengths: strong })];
    const { ranked, reasons } = rankCandidates(pool, loop, "BALANCED", none);
    expect(ids(ranked)).toEqual(["z/strong", "x/shared", "y/shared"]);
    expect(reasons).toEqual([]);
  });
});

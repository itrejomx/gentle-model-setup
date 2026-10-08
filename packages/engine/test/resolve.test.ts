import type { BundlePayload, PhaseRecord } from "@gentle-ai/profile-data";
import { describe, expect, it } from "vitest";
import { InvalidSelectionError } from "../src/errors.js";
import { resolveProfile } from "../src/resolve.js";
import type { Selection, Tier } from "../src/types.js";
import { catalog } from "./fixtures/catalog.js";

function selection(tier: Tier, overrides: Partial<Selection> = {}): Selection {
  return {
    subscriptions: [
      { subscription: "alpha", plan: "pro" },
      { subscription: "beta", plan: "standard" },
    ],
    tier,
    constraints: { clientCode: false },
    ...overrides,
  };
}

describe("resolveProfile on the fixture catalog", () => {
  it("resolves a primary and a Fallback Chain per Phase in BALANCED", () => {
    const profile = resolveProfile(catalog, selection("BALANCED"));
    expect(profile.tier).toBe("BALANCED");
    expect(profile.rows.map((row) => row.phase)).toEqual(["loop-phase", "one-shot-phase"]);
    const [loop, oneShot] = profile.rows;
    expect(loop?.primary).toBe("alpha/trainer");
    expect(loop?.fallbacks).toEqual(["alpha/work-horse", "beta/work-horse"]);
    expect(oneShot?.primary).toBe("alpha/sniper-one");
    expect(oneShot?.fallbacks).toEqual([
      "beta/work-horse",
      "alpha/work-horse",
      "alpha/trainer",
      "alpha/pro-only-unknown-cap",
    ]);
  });
});

function phaseNamed(id: string): PhaseRecord {
  const template = catalog.phases[0];
  if (template === undefined) throw new Error("fixture catalog has no Phase");
  return { ...template, id };
}

describe("resolveProfile Phase order", () => {
  it("puts gentle-ai-worker, then jd-fix-agent, then the payload order", () => {
    const payload: BundlePayload = {
      ...catalog,
      phases: ["zeta", "jd-fix-agent", "alpha-phase", "gentle-ai-worker", "mid"].map(phaseNamed),
    };
    const order = resolveProfile(payload, selection("BALANCED")).rows.map((row) => row.phase);
    expect(order).toEqual(["gentle-ai-worker", "jd-fix-agent", "zeta", "alpha-phase", "mid"]);
  });

  it("simply omits a leading Phase the payload does not hold", () => {
    const payload: BundlePayload = { ...catalog, phases: ["b", "jd-fix-agent", "a"].map(phaseNamed) };
    const order = resolveProfile(payload, selection("BALANCED")).rows.map((row) => row.phase);
    expect(order).toEqual(["jd-fix-agent", "b", "a"]);
  });
});

describe("resolveProfile reasons", () => {
  it("carries the primary's candidate-level reasons, then effort, then the Phase-level ones", () => {
    const loop = resolveProfile(catalog, selection("BALANCED")).rows[0];
    expect(loop?.reasons.map((reason) => reason.code)).toEqual([
      "budget-fit",
      "strength-score",
      "effort-default",
      "tier-applied",
    ]);
    expect(loop?.reasons[0]).toEqual({
      code: "budget-fit",
      params: { candidate: "alpha/trainer", budgetClass: "volume", callPattern: "loop", rank: 0 },
    });
    expect(loop?.reasons[3]).toMatchObject({ code: "tier-applied", params: { tier: "BALANCED", multiplier: 1 } });
  });
});

describe("resolveProfile Fallback Chains", () => {
  const alphaBasic = selection("BALANCED", { subscriptions: [{ subscription: "alpha", plan: "basic" }] });
  const betaOnly = selection("BALANCED", { subscriptions: [{ subscription: "beta", plan: "standard" }] });

  it("yields the chain that exists plus fallback-chain-short when fewer than two survive", () => {
    const [loop, oneShot] = resolveProfile(catalog, alphaBasic).rows;
    expect(loop?.fallbacks).toEqual(["alpha/work-horse"]);
    expect(loop?.warnings).toEqual([{ code: "fallback-chain-short", params: { phase: "loop-phase", length: 1 } }]);
    expect(oneShot?.fallbacks).toHaveLength(2);
    expect(oneShot?.warnings).toEqual([]);
  });

  it("never invents a fallback: a lone survivor has an empty chain and the warning", () => {
    const loop = resolveProfile(catalog, betaOnly).rows[0];
    expect(loop?.primary).toBe("beta/work-horse");
    expect(loop?.fallbacks).toEqual([]);
    expect(loop?.warnings).toEqual([{ code: "fallback-chain-short", params: { phase: "loop-phase", length: 0 } }]);
  });

  it("caps the chain at ten fallbacks", () => {
    const template = catalog.models[1];
    if (template === undefined) throw new Error("fixture catalog changed shape");
    const many = Array.from({ length: 14 }, (_, index) => ({ ...template, id: `clone-${String(index).padStart(2, "0")}` }));
    const payload: BundlePayload = { ...catalog, models: many };
    const loop = resolveProfile(payload, alphaBasic).rows[0];
    expect(loop?.primary).toBe("alpha/clone-00");
    expect(loop?.fallbacks).toHaveLength(10);
    expect(loop?.fallbacks[9]).toBe("alpha/clone-10");
    expect(loop?.warnings).toEqual([]);
  });
});

describe("resolveProfile unknown Budget Class", () => {
  it("serves a one-shot Phase from an unknown class with budget-unknown, and never a loop Phase", () => {
    const only = catalog.models.filter((model) => model.id === "pro-only-unknown-cap");
    const payload: BundlePayload = { ...catalog, models: only };
    const [loop, oneShot] = resolveProfile(payload, selection("BALANCED", { subscriptions: [{ subscription: "alpha", plan: "pro" }] })).rows;
    expect(loop?.primary).toBeNull();
    expect(oneShot?.primary).toBe("alpha/pro-only-unknown-cap");
    expect(oneShot?.warnings).toContainEqual({ code: "budget-unknown", params: { candidate: "alpha/pro-only-unknown-cap" } });
    expect(oneShot?.reasons.map((reason) => reason.code)).not.toContain("budget-fit");
  });
});

describe("resolveProfile empty rows", () => {
  function model(id: string, subscription: string) {
    const found = catalog.models.find((candidate) => candidate.id === id && candidate.subscription === subscription);
    if (found === undefined) throw new Error(`fixture has no ${subscription}/${id}`);
    return found;
  }
  // alpha basic offers only a sniper, which no loop Phase may use. alpha's
  // workhorse needs its pro Plan and beta's semi is not selected.
  const horse = model("work-horse", "alpha");
  const proPlan = horse.plans["pro"];
  if (proPlan === undefined) throw new Error("fixture work-horse has no pro Plan");
  const payload: BundlePayload = {
    ...catalog,
    models: [
      model("sniper-one", "alpha"),
      { ...horse, plans: { pro: proPlan } },
      model("work-horse", "beta"),
    ],
  };
  const alphaBasic = selection("BALANCED", { subscriptions: [{ subscription: "alpha", plan: "basic" }] });

  it("yields a null primary with pool-empty and the Subscriptions that would fill it, sorted by id", () => {
    const [loop, oneShot] = resolveProfile(payload, alphaBasic).rows;
    expect(loop).toEqual({
      phase: "loop-phase",
      primary: null,
      effort: "default",
      fallbacks: [],
      reasons: [
        { code: "pool-empty", params: { phase: "loop-phase" } },
        { code: "fill-candidate", params: { phase: "loop-phase", subscription: "alpha" } },
        { code: "fill-candidate", params: { phase: "loop-phase", subscription: "beta" } },
      ],
      warnings: [],
    });
    expect(oneShot?.primary).toBe("alpha/sniper-one");
  });

  it("names only Subscriptions whose eligible model also satisfies the constraints", () => {
    const loop = resolveProfile(payload, { ...alphaBasic, constraints: { clientCode: false, maxLogRetentionDays: 30 } }).rows[0];
    expect(loop?.reasons).toEqual([
      { code: "pool-empty", params: { phase: "loop-phase" } },
      { code: "fill-candidate", params: { phase: "loop-phase", subscription: "alpha" } },
    ]);
  });
});

describe("resolveProfile duplicate Subscriptions", () => {
  function required<T>(value: T | undefined, what: string): T {
    if (value === undefined) throw new Error(`fixture has no ${what}`);
    return value;
  }
  const beta = required(catalog.subscriptions.find((record) => record.id === "beta"), "beta");
  const sniper = required(catalog.models.find((record) => record.id === "sniper-one"), "sniper-one");
  const horse = required(catalog.models.find((record) => record.subscription === "beta"), "beta work-horse");
  const sniperPlan = required(sniper.plans["basic"], "sniper basic Plan");
  const payload: BundlePayload = {
    ...catalog,
    subscriptions: [
      { ...beta, id: "x", providerPrefix: "x" },
      { ...beta, id: "y", providerPrefix: "y" },
    ],
    models: [
      { ...sniper, id: "only-y", subscription: "y", plans: { standard: sniperPlan } },
      { ...horse, subscription: "x" },
      { ...horse, subscription: "y" },
    ],
    phases: [
      { ...phaseNamed("gentle-ai-worker"), callPattern: "one-shot" },
      { ...phaseNamed("second"), callPattern: "loop" },
    ],
  };
  const both = selection("BALANCED", {
    subscriptions: [
      { subscription: "x", plan: "standard" },
      { subscription: "y", plan: "standard" },
    ],
  });

  it("prefers the Subscription already holding more rows in this Profile", () => {
    const [first, second] = resolveProfile(payload, both).rows;
    expect(first?.primary).toBe("y/only-y");
    expect(second?.primary).toBe("y/work-horse");
    expect(second?.fallbacks).toEqual(["x/work-horse"]);
    expect(second?.reasons).toContainEqual({
      code: "duplicate-tiebreak",
      params: { kept: "y/work-horse", dropped: "x/work-horse", rule: "subscription-rows" },
    });
  });
});

describe("resolveProfile at each Tier", () => {
  const strengths = (quality: number, cheap: number) => ({
    oneShotReasoning: quality,
    sustainedReasoning: quality,
    codingTools: quality,
    longContext: quality,
    multimodal: 0,
    cheap,
  });
  // Between the two loop-eligible models, the workhorse is stronger and the
  // volume model is cheaper; the Tier decides which one wins.
  const payload: BundlePayload = {
    ...catalog,
    models: catalog.models.map((model) =>
      model.subscription !== "alpha"
        ? model
        : model.id === "work-horse"
          ? { ...model, strengths: strengths(3, 0) }
          : model.id === "trainer"
            ? { ...model, strengths: strengths(2, 3) }
            : model,
    ),
  };
  const alphaPro = (tier: Tier) => selection(tier, { subscriptions: [{ subscription: "alpha", plan: "pro" }] });

  it("HIGH picks the stronger workhorse at high effort", () => {
    const loop = resolveProfile(payload, alphaPro("HIGH")).rows[0];
    expect(loop?.primary).toBe("alpha/work-horse");
    expect(loop?.effort).toBe("high");
    expect(loop?.reasons).toContainEqual({
      code: "effort-high",
      params: { candidate: "alpha/work-horse", budgetClass: "workhorse" },
    });
    expect(loop?.fallbacks).toEqual(["alpha/trainer"]);
  });

  it("BALANCED keeps the stronger workhorse at default effort", () => {
    const loop = resolveProfile(payload, alphaPro("BALANCED")).rows[0];
    expect(loop?.primary).toBe("alpha/work-horse");
    expect(loop?.effort).toBe("default");
  });

  it("LEAN prefers the cheaper model at default effort", () => {
    const loop = resolveProfile(payload, alphaPro("LEAN")).rows[0];
    expect(loop?.primary).toBe("alpha/trainer");
    expect(loop?.effort).toBe("default");
    expect(loop?.fallbacks).toEqual(["alpha/work-horse"]);
    expect(loop?.reasons).toContainEqual({
      code: "tier-applied",
      params: { tier: "LEAN", multiplier: 3, cheapWeight: 3 / 7 },
    });
  });

  it("gives a sniper primary default effort even in HIGH", () => {
    const oneShot = resolveProfile(catalog, alphaPro("HIGH")).rows[1];
    expect(oneShot?.primary).toBe("alpha/sniper-one");
    expect(oneShot?.effort).toBe("default");
  });

  it("resolves the plain fixture catalog to the same primaries at every Tier", () => {
    for (const tier of ["HIGH", "BALANCED", "LEAN"] as Tier[]) {
      const profile = resolveProfile(catalog, selection(tier));
      expect(profile.tier).toBe(tier);
      expect(profile.rows.map((row) => [row.phase, row.primary, row.effort])).toEqual([
        ["loop-phase", "alpha/trainer", "default"],
        ["one-shot-phase", "alpha/sniper-one", "default"],
      ]);
    }
  });
});

describe("resolveProfile output", () => {
  const CODES = [
    "strength-score", "tier-applied", "budget-filter", "budget-fit", "constraint-pruned", "effort-high",
    "effort-default", "duplicate-tiebreak", "pool-empty", "fill-candidate", "fallback-chain-short",
    "budget-unknown", "retention-unknown",
  ];
  const ENUMS = [
    "default", "high", "HIGH", "BALANCED", "LEAN", "sniper", "semi", "workhorse", "volume", "loop", "one-shot",
    "clientCode", "maxLogRetentionDays", "budget-class", "capped-over-metered", "subscription-rows",
  ];
  const allowed = new Set<string>([
    ...CODES,
    ...ENUMS,
    ...catalog.phases.map((phase) => phase.id),
    ...catalog.subscriptions.map((record) => record.id),
    ...catalog.models.map((model) => `${model.subscription}/${model.id}`),
  ]);

  function strings(value: unknown, path: string, out: [string, string][]): void {
    if (typeof value === "string") out.push([path, value]);
    else if (Array.isArray(value)) value.forEach((item, index) => strings(item, `${path}[${index}]`, out));
    else if (typeof value === "object" && value !== null) {
      for (const [key, item] of Object.entries(value)) strings(item, `${path}.${key}`, out);
    }
  }

  it("holds no string other than ids, codes, and enumerated values, on any row", () => {
    const selections: Selection[] = [
      selection("HIGH"),
      selection("LEAN", { subscriptions: [{ subscription: "alpha", plan: "basic" }] }),
      selection("BALANCED", { subscriptions: [{ subscription: "beta", plan: "standard" }] }),
      selection("BALANCED", { constraints: { clientCode: true, maxLogRetentionDays: 30 } }),
      // every candidate pruned: both rows are empty and name fill candidates
      selection("BALANCED", {
        subscriptions: [{ subscription: "beta", plan: "standard" }],
        constraints: { clientCode: false, maxLogRetentionDays: 30 },
      }),
    ];
    let walked = 0;
    for (const chosen of selections) {
      const found: [string, string][] = [];
      strings(resolveProfile(catalog, chosen), "profile", found);
      walked += found.length;
      for (const [path, text] of found) expect(allowed.has(text), `${path} = ${text}`).toBe(true);
    }
    expect(walked).toBeGreaterThan(50);
  });

  it("ignores pins and leaves the payload and selection untouched", () => {
    const chosen = selection("BALANCED");
    const before = JSON.stringify([catalog, chosen]);
    const plain = resolveProfile(catalog, chosen);
    const pinned = resolveProfile(catalog, { ...chosen, pins: { "loop-phase": "beta/work-horse" } });
    expect(pinned).toEqual(plain);
    expect(JSON.stringify([catalog, chosen])).toBe(before);
    expect(plain.rows.every((row) => row.pin === undefined && row.override === undefined)).toBe(true);
  });

  it("rejects an invalid selection rather than returning an empty Profile", () => {
    expect(() => resolveProfile(catalog, selection("BALANCED", { subscriptions: [{ subscription: "nope", plan: "x" }] }))).toThrow(
      InvalidSelectionError,
    );
  });
});

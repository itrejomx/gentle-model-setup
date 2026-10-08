import { join } from "node:path";
import { buildBundle, loadData } from "@gentle-ai/profile-data";
import type { BundlePayload } from "@gentle-ai/profile-data";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveProfile } from "../src/resolve.js";
import type { Selection, Tier } from "../src/types.js";

const dataRoot = join(import.meta.dirname, "..", "..", "..", "data");
const TIERS: Tier[] = ["HIGH", "BALANCED", "LEAN"];
const LOOP_ROWS = ["gentle-orchestrator", "gentle-ai-worker"];

let payload: BundlePayload;

beforeAll(async () => {
  payload = buildBundle(await loadData(dataRoot)).payload;
});

function selection(tier: Tier): Selection {
  return {
    subscriptions: [{ subscription: "opencode-go", plan: "go" }],
    tier,
    constraints: { clientCode: false },
  };
}

/** Current OpenCode Go models whose `go` Plan is a sniper Budget Class, derived from the payload. */
function goSnipers(): Set<string> {
  return new Set(
    payload.models
      .filter((model) => model.subscription === "opencode-go" && model.status === "current" && model.plans["go"]?.budgetClass === "sniper")
      .map((model) => `opencode-go/${model.id}`),
  );
}

function expectedPhaseOrder(): string[] {
  const leading = ["gentle-ai-worker", "jd-fix-agent"];
  return [...leading, ...payload.phases.map((phase) => phase.id).filter((id) => !leading.includes(id))];
}

describe("resolveProfile on the committed data, OpenCode Go", () => {
  it("finds at least one current sniper on the Go Plan", () => {
    expect(goSnipers().size).toBeGreaterThan(0);
  });

  for (const tier of TIERS) {
    describe(tier, () => {
      it("returns 13 non-empty rows in Phase order", () => {
        const { rows } = resolveProfile(payload, selection(tier));
        expect(rows.map((row) => row.phase)).toEqual(expectedPhaseOrder());
        expect(rows).toHaveLength(13);
        for (const row of rows) expect(row.primary, row.phase).not.toBeNull();
      });

      it("keeps every chain within 2 to 10 unless it is flagged short", () => {
        for (const row of resolveProfile(payload, selection(tier)).rows) {
          const short = row.warnings.some((warning) => warning.code === "fallback-chain-short");
          if (!short) {
            expect(row.fallbacks.length, row.phase).toBeGreaterThanOrEqual(2);
            expect(row.fallbacks.length, row.phase).toBeLessThanOrEqual(10);
          }
        }
      });

      it("never puts a sniper in the loop rows, as primary or fallback", () => {
        const rows = resolveProfile(payload, selection(tier)).rows.filter((row) => LOOP_ROWS.includes(row.phase));
        expect(rows).toHaveLength(2);
        const snipers = goSnipers();
        expect(snipers.size).toBeGreaterThan(0);
        for (const row of rows) {
          for (const id of [row.primary, ...row.fallbacks]) {
            expect(snipers.has(id ?? ""), `${row.phase}: ${id}`).toBe(false);
          }
        }
      });

      it("never flags a short chain and gives every row exactly 10 fallbacks", () => {
        for (const row of resolveProfile(payload, selection(tier)).rows) {
          expect(row.warnings.map((warning) => warning.code), row.phase).not.toContain("fallback-chain-short");
          expect(row.fallbacks, row.phase).toHaveLength(10);
        }
      });

      it("carries reasons and warnings as codes with parameters only", () => {
        for (const row of resolveProfile(payload, selection(tier)).rows) {
          for (const factor of [...row.reasons, ...row.warnings]) {
            expect(Object.keys(factor).sort(), row.phase).toEqual(["code", "params"]);
            expect(typeof factor.code).toBe("string");
            for (const value of Object.values(factor.params)) {
              expect(["string", "number"], row.phase).toContain(typeof value);
            }
          }
        }
      });
    });
  }
});

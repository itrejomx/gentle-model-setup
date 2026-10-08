import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBundle, loadData } from "@gentle-ai/profile-data";
import type { Bundle } from "@gentle-ai/profile-data";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runDemoCli } from "../src/cli/demo-command.js";

const dataRoot = join(import.meta.dirname, "..", "..", "..", "data");

let directory: string;
let bundle: Bundle;
let bundlePath: string;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "engine-demo-"));
  bundle = buildBundle(await loadData(dataRoot));
  bundlePath = join(directory, "data.json");
  writeFileSync(bundlePath, JSON.stringify(bundle));
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    streams: {
      stdout: { write: (chunk: string | Uint8Array) => ((stdout += String(chunk)), true) },
      stderr: { write: (chunk: string | Uint8Array) => ((stderr += String(chunk)), true) },
    },
    out: () => stdout,
    err: () => stderr,
  };
}

describe("runDemoCli", () => {
  it("prints a 13-row table per Tier for OpenCode Go and exits 0", async () => {
    const io = capture();
    expect(await runDemoCli([bundlePath], io.streams)).toBe(0);
    expect(io.err()).toBe("");
    const tables = io.out().trimEnd().split("\n\n");
    expect(tables).toHaveLength(3);
    const phases = bundle.payload.phases.map((phase) => phase.id).sort();
    ["HIGH", "BALANCED", "LEAN"].forEach((tier, index) => {
      const lines = (tables[index] ?? "").split("\n");
      expect(lines[0]).toContain("OpenCode Go");
      expect(lines[0]).toContain("go");
      expect(lines[0]).toContain(tier);
      expect(lines[1]).toMatch(/^Phase\s+Primary\s+Effort\s+Fallbacks$/);
      const rows = lines.slice(2).map((line) => line.trim().split(/\s+/));
      expect(rows).toHaveLength(13);
      expect(rows.map((row) => row[0]).sort()).toEqual(phases);
      for (const row of rows) {
        expect(row[1]).toMatch(/^opencode-go\//);
        expect(["default", "high"]).toContain(row[2]);
        expect(row[3]).toMatch(/^\d+$/);
      }
    });
  });

  it("exits 2 for a missing bundle", async () => {
    const io = capture();
    expect(await runDemoCli([join(directory, "missing.json")], io.streams)).toBe(2);
    expect(io.out()).toBe("");
    expect(io.err()).toContain("missing.json");
  });

  it("exits 2 for more than one argument", async () => {
    const io = capture();
    expect(await runDemoCli(["a", "b"], io.streams)).toBe(2);
    expect(io.err()).toContain("usage");
  });

  it("exits 1 for a bundle that fails loadBundle", async () => {
    const tampered = join(directory, "tampered.json");
    writeFileSync(tampered, JSON.stringify({ ...bundle, hash: "0".repeat(64) }));
    const malformed = join(directory, "malformed.json");
    writeFileSync(malformed, "{ not json");
    for (const path of [tampered, malformed]) {
      const io = capture();
      expect(await runDemoCli([path], io.streams), path).toBe(1);
      expect(io.out()).toBe("");
      expect(io.err()).not.toBe("");
    }
  });

  it("exits 1 with the invalid selection on stderr for a bundle without the opencode-go Subscription", async () => {
    const data = await loadData(dataRoot);
    const withoutGo = buildBundle({
      ...data,
      subscriptions: data.subscriptions.filter((subscription) => subscription.id !== "opencode-go"),
      models: data.models.filter((model) => model.subscription !== "opencode-go"),
      // A Runtime Mapping may not name a provider prefix no Subscription declares.
      runtimes: data.runtimes.map((runtime) => ({
        ...runtime,
        prefixMap: Object.fromEntries(Object.entries(runtime.prefixMap).filter(([prefix]) => prefix !== "opencode-go")),
      })),
    });
    const path = join(directory, "without-go.json");
    writeFileSync(path, JSON.stringify(withoutGo));
    const io = capture();
    expect(await runDemoCli([path], io.streams)).toBe(1);
    expect(io.out()).toBe("");
    expect(io.err()).toContain('invalid selection for subscription "opencode-go"');
  });
});

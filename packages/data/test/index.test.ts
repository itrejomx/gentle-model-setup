import { describe, expect, it } from "vitest";
import { VERSION } from "../src/index.js";

describe("package entry point", () => {
  it("exports a non-empty VERSION string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
  });
});

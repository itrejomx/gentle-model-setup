import { describe, expect, it } from "vitest";
import { errorMessage } from "../src/errors.js";

// Issue #35 (R2-yaml-read-error-cast / R3-read-error-cast): `yaml.ts` built
// its error messages with `(cause as Error).message`, which reads as
// `undefined` for a thrown non-Error value instead of the shared narrowing
// helper `cli/io.ts` already had. This is the one place that property is
// unit-tested directly; `yaml.ts` and `cli/io.ts` both call through it.
describe("errorMessage", () => {
  it("returns an Error's own message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies a thrown non-Error value instead of printing undefined", () => {
    expect(errorMessage("plain string")).toBe("plain string");
  });
});

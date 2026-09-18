import { describe, expect, it } from "vitest";
import { runGuarded, writeDataErrors } from "../../src/cli/io.js";

function captureStderr(): { streams: { stdout: { write: (chunk: string) => boolean }; stderr: { write: (chunk: string) => boolean } }; err: string[] } {
  const err: string[] = [];
  return {
    streams: {
      stdout: { write: () => true },
      stderr: {
        write: (chunk: string) => {
          err.push(chunk);
          return true;
        },
      },
    },
    err,
  };
}

describe("runGuarded", () => {
  it("returns the exit code of a run that completes", async () => {
    const { streams, err } = captureStderr();
    const code = await runGuarded(async () => 1, [], streams);

    expect(code).toBe(1);
    expect(err.join("")).toBe("");
  });

  it("turns an unexpected throw into exit 2 with a one-line message, never exit 1", async () => {
    const { streams, err } = captureStderr();
    const code = await runGuarded(
      async () => {
        throw new Error("boom");
      },
      [],
      streams,
    );

    expect(code).toBe(2);
    expect(err.join("")).toBe("error: boom\n");
  });

  it("reports a thrown non-Error value without casting it", async () => {
    const { streams, err } = captureStderr();
    const code = await runGuarded(
      async () => {
        throw "plain string";
      },
      [],
      streams,
    );

    expect(code).toBe(2);
    expect(err.join("")).toBe("error: plain string\n");
  });
});

describe("writeDataErrors", () => {
  it("orders errors with the same file and field by message, whatever the input order", () => {
    const first = { file: "a.yaml", field: "id", message: "alpha" };
    const second = { file: "a.yaml", field: "id", message: "beta" };

    const forward = captureStderr();
    writeDataErrors(forward.streams, [first, second]);
    const reversed = captureStderr();
    writeDataErrors(reversed.streams, [second, first]);

    expect(reversed.err).toEqual(forward.err);
    expect(forward.err[0]).toBe("a.yaml:id: alpha\n");
  });
});

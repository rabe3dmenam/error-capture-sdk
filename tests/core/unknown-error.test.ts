import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { buildUnknownError } from "../../src/core/unknown-error.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return {
    command: "npm run build",
    exitCode: 1,
    stdout: "",
    stderr: "",
    ...overrides,
  };
}

describe("buildUnknownError", () => {
  it("summarizes from the first non-empty line of stderr when present", () => {
    const error = buildUnknownError(rawResult({ stderr: "\n  boom: something broke\nmore detail\n" }));

    expect(error.type).toBe("unknown_error");
    expect(error.summary).toBe("boom: something broke");
    expect(error.confidence).toBe(0.2);
    expect(error.file).toBeNull();
    expect(error.suggestedFix).toBeNull();
    expect(error.details).toEqual({});
  });

  it("falls back to stdout when stderr is empty", () => {
    const error = buildUnknownError(rawResult({ stdout: "build failed silently", stderr: "" }));

    expect(error.summary).toBe("build failed silently");
  });

  it("falls back to a generic message when both stdout and stderr are empty", () => {
    const error = buildUnknownError(rawResult({ stdout: "", stderr: "", exitCode: 127 }));

    expect(error.summary).toBe("Command exited with code 127");
    expect(error.rawExcerpt).toBe("");
  });

  it("truncates rawExcerpt to the max length", () => {
    const longStderr = "x".repeat(1000);
    const error = buildUnknownError(rawResult({ stderr: longStderr }));

    expect(error.rawExcerpt).toHaveLength(500);
  });
});

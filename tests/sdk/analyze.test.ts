import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { analyze } from "../../src/sdk/analyze.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return {
    command: "npm run build",
    exitCode: 1,
    stdout: "",
    stderr: "",
    ...overrides,
  };
}

describe("analyze", () => {
  it("returns success: true with empty errors for a zero exit code", () => {
    const result = analyze(rawResult({ exitCode: 0, stdout: "build ok" }));

    expect(result).toEqual({
      success: true,
      command: "npm run build",
      exitCode: 0,
      durationMs: 0,
      errors: [],
      raw: { stdout: "build ok", stderr: "" },
    });
  });

  it("falls back to unknown_error for a failing command (no classifiers registered yet)", () => {
    const result = analyze(rawResult({ exitCode: 1, stderr: "boom: something broke" }));

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.type).toBe("unknown_error");
  });

  it("defaults durationMs to 0 when the RawResult doesn't supply one", () => {
    const result = analyze(rawResult({ exitCode: 0, durationMs: undefined }));

    expect(result.durationMs).toBe(0);
  });

  it("passes through a supplied durationMs unchanged", () => {
    const result = analyze(rawResult({ exitCode: 0, durationMs: 4213 }));

    expect(result.durationMs).toBe(4213);
  });

  it("echoes raw stdout/stderr untouched", () => {
    const result = analyze(rawResult({ exitCode: 1, stdout: "some output", stderr: "some error" }));

    expect(result.raw).toEqual({ stdout: "some output", stderr: "some error" });
  });
});

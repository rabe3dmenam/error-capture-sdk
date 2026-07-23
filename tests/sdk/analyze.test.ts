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

  it("classifies Node's ESM ERR_MODULE_NOT_FOUND form as missing_dependency, not unknown_error", () => {
    const stderr = "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'axios' imported from /Users/dev/project/src/index.js";
    const result = analyze(rawResult({ stderr }));

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ type: "missing_dependency", details: { package: "axios" }, proHint: null });
  });

  it("attaches a proHint to unknown_error for a Pro-tier-shaped failure nothing free classifies", () => {
    const stderr = "src/index.ts:4:3 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.";
    const result = analyze(rawResult({ stderr }));

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.type).toBe("unknown_error");
    expect(result.errors[0]?.proHint).toBe("This looks like a 'type_error', handled by the Pro package.");
  });

  it("leaves proHint null on unknown_error for a genuinely unrecognized failure", () => {
    const result = analyze(rawResult({ stderr: "boom: something broke" }));

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.type).toBe("unknown_error");
    expect(result.errors[0]?.proHint).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { typeErrorClassifier } from "../../src/classifiers/type-error.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "npm run build", exitCode: 1, stdout: "", stderr: "", ...overrides };
}

describe("typeErrorClassifier", () => {
  it("matches and classifies a TS2xxx diagnostic", () => {
    const input = rawResult({
      stderr: "src/foo.ts:10:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
    });

    expect(typeErrorClassifier.matches(input)).toBe(true);
    const [error] = typeErrorClassifier.classify(input);

    expect(error).toMatchObject({
      type: "type_error",
      summary: "Argument of type 'string' is not assignable to parameter of type 'number'.",
      file: "src/foo.ts",
      line: 10,
      column: 5,
      details: { code: "TS2345", message: "Argument of type 'string' is not assignable to parameter of type 'number'." },
      suggestedFix: null,
      classifier: "type_error@1",
    });
  });

  it("matches tsc's plain (non-pretty) diagnostic format — what tsc actually emits when run non-interactively via capture()", () => {
    const input = rawResult({ stderr: "src/foo.ts(10,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'." });

    expect(typeErrorClassifier.matches(input)).toBe(true);
    const [error] = typeErrorClassifier.classify(input);

    expect(error).toMatchObject({ file: "src/foo.ts", line: 10, column: 5, details: { code: "TS2345" } });
  });

  it("collects multiple diagnostics from one run", () => {
    const stderr = [
      "src/a.ts:1:1 - error TS2322: Type 'string' is not assignable to type 'number'.",
      "src/b.ts:2:2 - error TS2339: Property 'x' does not exist on type 'Foo'.",
    ].join("\n");
    const input = rawResult({ stderr });

    const errors = typeErrorClassifier.classify(input);

    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.details)).toEqual([{ code: "TS2322", message: "Type 'string' is not assignable to type 'number'." }, { code: "TS2339", message: "Property 'x' does not exist on type 'Foo'." }]);
  });

  it("does not match TS2307 (missing_dependency/module_not_found's job)", () => {
    const input = rawResult({
      stderr: "src/index.ts:1:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.",
    });

    expect(typeErrorClassifier.matches(input)).toBe(false);
    expect(typeErrorClassifier.classify(input)).toEqual([]);
  });

  it("does not match a TS1xxx syntax diagnostic (syntax_error's job)", () => {
    const input = rawResult({ stderr: "src/index.ts:1:1 - error TS1005: ';' expected." });

    expect(typeErrorClassifier.matches(input)).toBe(false);
  });
});

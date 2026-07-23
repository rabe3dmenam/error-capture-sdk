import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { syntaxErrorClassifier } from "../../src/classifiers/syntax-error.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "npm run build", exitCode: 1, stdout: "", stderr: "", ...overrides };
}

describe("syntaxErrorClassifier", () => {
  it("matches and classifies a TS1xxx syntax diagnostic", () => {
    const input = rawResult({ stderr: "src/index.ts:12:8 - error TS1005: ';' expected." });

    expect(syntaxErrorClassifier.matches(input)).toBe(true);
    const [error] = syntaxErrorClassifier.classify(input);

    expect(error).toMatchObject({
      type: "syntax_error",
      summary: "';' expected.",
      file: "src/index.ts",
      line: 12,
      column: 8,
      details: { message: "';' expected." },
      suggestedFix: null,
      confidence: 0.85,
      classifier: "syntax_error@1",
    });
  });

  it("matches tsc's plain (non-pretty) diagnostic format — what tsc actually emits when run non-interactively via capture()", () => {
    const input = rawResult({ stderr: "src/index.ts(12,8): error TS1005: ';' expected." });

    expect(syntaxErrorClassifier.matches(input)).toBe(true);
    const [error] = syntaxErrorClassifier.classify(input);

    expect(error).toMatchObject({ file: "src/index.ts", line: 12, column: 8, details: { message: "';' expected." } });
  });

  it("matches a plain Node SyntaxError with file/line as null (unreliable to extract)", () => {
    const stderr = [
      "/Users/dev/project/index.js:10",
      "  conts x = 5;",
      "  ^^^^^",
      "",
      "SyntaxError: Unexpected identifier 'x'",
      "    at wrapSafe (node:internal/modules/cjs/loader:1153:18)",
    ].join("\n");
    const input = rawResult({ stderr });

    const [error] = syntaxErrorClassifier.classify(input);

    expect(error).toMatchObject({
      type: "syntax_error",
      summary: "Unexpected identifier 'x'",
      file: null,
      line: null,
      column: null,
      details: { message: "Unexpected identifier 'x'" },
      confidence: 0.6,
    });
  });

  it("does not match a TS2xxx type diagnostic (type_error's job)", () => {
    const input = rawResult({ stderr: "src/index.ts:1:1 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'." });

    expect(syntaxErrorClassifier.matches(input)).toBe(false);
  });
});

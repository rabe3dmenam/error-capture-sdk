import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { moduleNotFoundClassifier } from "../../src/classifiers/module-not-found.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "npm run build", exitCode: 1, stdout: "", stderr: "", ...overrides };
}

describe("moduleNotFoundClassifier", () => {
  it("matches a relative import path from a tsc diagnostic", () => {
    const input = rawResult({
      stderr: "src/index.ts:5:10 - error TS2307: Cannot find module './utils/helpres' or its corresponding type declarations.",
    });

    expect(moduleNotFoundClassifier.matches(input)).toBe(true);
    const [error] = moduleNotFoundClassifier.classify(input);

    expect(error).toMatchObject({
      type: "module_not_found",
      summary: "Cannot resolve import './utils/helpres'",
      file: "src/index.ts",
      line: 5,
      column: 10,
      details: { importPath: "./utils/helpres" },
      suggestedFix: null,
      classifier: "module_not_found@1",
    });
  });

  it("matches tsc's plain (non-pretty) diagnostic format — what tsc actually emits when run non-interactively via capture()", () => {
    const input = rawResult({ stderr: "src/index.ts(5,10): error TS2307: Cannot find module './utils/helpres' or its corresponding type declarations." });

    const [error] = moduleNotFoundClassifier.classify(input);

    expect(error).toMatchObject({ file: "src/index.ts", line: 5, column: 10, details: { importPath: "./utils/helpres" } });
  });

  it("matches an absolute import path too", () => {
    const input = rawResult({ stderr: "src/index.ts:1:1 - error TS2307: Cannot find module '/abs/path/mod' or its corresponding type declarations." });

    const [error] = moduleNotFoundClassifier.classify(input);

    expect(error?.details).toEqual({ importPath: "/abs/path/mod" });
  });

  it("matches a plain Node require() failure on a relative path", () => {
    const stderr = ["Error: Cannot find module './config'", "Require stack:", "- /Users/dev/project/src/index.js"].join("\n");
    const input = rawResult({ stderr });

    const [error] = moduleNotFoundClassifier.classify(input);

    expect(error).toMatchObject({
      details: { importPath: "./config" },
      file: "/Users/dev/project/src/index.js",
    });
  });

  it("pairs each require-stack file with its own error when multiple require failures appear in one output", () => {
    const stderr = [
      "Error: Cannot find module './a'",
      "Require stack:",
      "- /Users/dev/project/src/x.js",
      "Error: Cannot find module './b'",
      "Require stack:",
      "- /Users/dev/project/src/y.js",
    ].join("\n");
    const input = rawResult({ stderr });

    const errors = moduleNotFoundClassifier.classify(input);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ details: { importPath: "./a" }, file: "/Users/dev/project/src/x.js" });
    expect(errors[1]).toMatchObject({ details: { importPath: "./b" }, file: "/Users/dev/project/src/y.js" });
  });

  it("matches Node's ESM loader ERR_MODULE_NOT_FOUND form for a relative/resolved path", () => {
    const stderr = [
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/dev/project/src/utils.js' imported from /Users/dev/project/src/index.js",
      "    at moduleResolve (node:internal/modules/esm/resolve:1367:20)",
    ].join("\n");
    const input = rawResult({ stderr });

    expect(moduleNotFoundClassifier.matches(input)).toBe(true);
    const [error] = moduleNotFoundClassifier.classify(input);

    expect(error).toMatchObject({
      type: "module_not_found",
      details: { importPath: "/Users/dev/project/src/utils.js" },
      file: "/Users/dev/project/src/index.js",
      proHint: null,
    });
  });

  it("does not match a bare package specifier (that's missing_dependency's job)", () => {
    const input = rawResult({
      stderr: "src/index.ts:1:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.",
    });

    expect(moduleNotFoundClassifier.matches(input)).toBe(false);
    expect(moduleNotFoundClassifier.classify(input)).toEqual([]);
  });
});

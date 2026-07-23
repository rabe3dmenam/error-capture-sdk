import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { missingDependencyClassifier } from "../../src/classifiers/missing-dependency.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "npm run build", exitCode: 1, stdout: "", stderr: "", ...overrides };
}

describe("missingDependencyClassifier", () => {
  it("matches and classifies the ERROR_SCHEMA.md section 6 tsc diagnostic", () => {
    const stdout = [
      "> app@1.0.0 build",
      "> tsc && vite build",
      "",
      "src/api.ts:3:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.",
      "",
      "3 import axios from 'axios';",
      "  ~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "",
      "Found 1 error.",
    ].join("\n");
    const input = rawResult({ stdout, stderr: "npm ERR! code ELIFECYCLE" });

    expect(missingDependencyClassifier.matches(input)).toBe(true);
    const errors = missingDependencyClassifier.classify(input);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      type: "missing_dependency",
      summary: "Module 'axios' is not installed",
      file: "src/api.ts",
      line: 3,
      column: 1,
      details: { package: "axios" },
      suggestedFix: "npm install axios",
      classifier: "missing_dependency@1",
    });
  });

  it("matches tsc's plain (non-pretty) diagnostic format — what tsc actually emits when run non-interactively via capture()", () => {
    const input = rawResult({ stderr: "src/api.ts(3,1): error TS2307: Cannot find module 'axios' or its corresponding type declarations." });

    expect(missingDependencyClassifier.matches(input)).toBe(true);
    const [error] = missingDependencyClassifier.classify(input);

    expect(error).toMatchObject({
      type: "missing_dependency",
      file: "src/api.ts",
      line: 3,
      column: 1,
      details: { package: "axios" },
    });
  });

  it("resolves scoped package names to scope/name, not just the scope", () => {
    const input = rawResult({
      stderr: "src/index.ts:1:1 - error TS2307: Cannot find module '@scope/pkg/sub/path' or its corresponding type declarations.",
    });

    const [error] = missingDependencyClassifier.classify(input);

    expect(error?.details).toEqual({ package: "@scope/pkg" });
  });

  it("matches a plain Node require() failure and extracts the requiring file from the require stack", () => {
    const stderr = [
      "Error: Cannot find module 'lodash'",
      "Require stack:",
      "- /Users/dev/project/src/index.js",
      "    at Module._resolveFilename (node:internal/modules/cjs/loader:1234:15)",
    ].join("\n");
    const input = rawResult({ stderr });

    const [error] = missingDependencyClassifier.classify(input);

    expect(error).toMatchObject({
      type: "missing_dependency",
      details: { package: "lodash" },
      file: "/Users/dev/project/src/index.js",
      line: null,
      column: null,
    });
  });

  it("pairs each require-stack file with its own error when multiple require failures appear in one output", () => {
    const stderr = [
      "Error: Cannot find module 'lodash'",
      "Require stack:",
      "- /Users/dev/project/src/a.js",
      "Error: Cannot find module 'axios'",
      "Require stack:",
      "- /Users/dev/project/src/b.js",
    ].join("\n");
    const input = rawResult({ stderr });

    const errors = missingDependencyClassifier.classify(input);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ details: { package: "lodash" }, file: "/Users/dev/project/src/a.js" });
    expect(errors[1]).toMatchObject({ details: { package: "axios" }, file: "/Users/dev/project/src/b.js" });
  });

  it("does not match a relative import path (that's module_not_found's job)", () => {
    const input = rawResult({
      stderr: "src/index.ts:1:1 - error TS2307: Cannot find module './utils/helpers' or its corresponding type declarations.",
    });

    expect(missingDependencyClassifier.matches(input)).toBe(false);
    expect(missingDependencyClassifier.classify(input)).toEqual([]);
  });

  it("does not match unrelated output", () => {
    const input = rawResult({ stdout: "build succeeded", stderr: "" });

    expect(missingDependencyClassifier.matches(input)).toBe(false);
  });
});

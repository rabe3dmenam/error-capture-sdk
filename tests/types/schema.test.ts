import { describe, expect, it } from "vitest";
import type { CaptureResult } from "../../src/types/index.js";

describe("schema types", () => {
  it("accepts the ERROR_SCHEMA.md section 6 end-to-end example", () => {
    const result: CaptureResult = {
      success: false,
      command: "npm run build",
      exitCode: 1,
      durationMs: 3820,
      errors: [
        {
          type: "missing_dependency",
          summary: "Module 'axios' is not installed",
          file: "src/api.ts",
          line: 3,
          column: 1,
          details: { package: "axios" },
          suggestedFix: "npm install axios",
          confidence: 0.92,
          classifier: "missing_dependency@1",
          rawExcerpt: "src/api.ts:3:1 - error TS2307: Cannot find module 'axios'…",
          proHint: null,
        },
      ],
      raw: {
        stdout: "> app@1.0.0 build\n> tsc && vite build\n…",
        stderr: "npm ERR! code ELIFECYCLE\n…",
      },
    };

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);

    const [error] = result.errors;
    expect(error?.type).toBe("missing_dependency");

    // Discriminated union: narrowing on `type` must narrow `details`.
    if (error?.type === "missing_dependency") {
      expect(error.details.package).toBe("axios");
    }
  });

  it("requires errors to be empty when success is true", () => {
    const result: CaptureResult = {
      success: true,
      command: "npm run build",
      exitCode: 0,
      durationMs: 1200,
      errors: [],
      raw: { stdout: "build ok", stderr: "" },
    };

    expect(result.errors).toEqual([]);
  });
});

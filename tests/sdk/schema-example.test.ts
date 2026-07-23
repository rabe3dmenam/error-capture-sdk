import { describe, expect, it } from "vitest";
import { analyze } from "../../src/sdk/analyze.js";

/**
 * PROJECT_BRIEF.md section 7 step 6: "Prove it against the section 6
 * example in the schema." This is the real, now-populated classifier
 * registry (Phase 5) — not a hand-built fixture — run against the exact
 * input/output pair from ERROR_SCHEMA.md section 6. It must produce
 * exactly one missing_dependency error, with no install_failure leaking in
 * from the ELIFECYCLE line.
 */
describe("ERROR_SCHEMA.md section 6 end-to-end example", () => {
  it("turns the documented raw npm run build failure into the documented CaptureResult", () => {
    const stdout = "> app@1.0.0 build\n> tsc && vite build\n\nsrc/api.ts:3:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.\n\n3 import axios from 'axios';\n  ~~~~~~~~~~~~~~~~~~~~~~~~~~\n\nFound 1 error.\n";
    const stderr = "npm ERR! code ELIFECYCLE\n";

    const result = analyze({
      command: "npm run build",
      exitCode: 1,
      stdout,
      stderr,
      durationMs: 3820,
    });

    expect(result.success).toBe(false);
    expect(result.command).toBe("npm run build");
    expect(result.exitCode).toBe(1);
    expect(result.durationMs).toBe(3820);
    expect(result.raw).toEqual({ stdout, stderr });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
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
});

import { describe, expect, it } from "vitest";
import { analyze } from "../../src/sdk/analyze.js";

/**
 * Unlike schema-example.test.ts (which proves exactly ONE classifier fires
 * on the documented example), this proves the real, fully-populated FREE
 * registry correctly separates TWO independent real problems in one
 * combined capture, without conflating or dropping either.
 *
 * Uses two free classifiers (missing_dependency, command_not_found) —
 * this test originally used a Pro-tier pairing (install_failure +
 * type_error) before SPLIT_INSTRUCTIONS.md moved those classifiers to the
 * private error-capture-sdk-pro package; see DECISIONS.md.
 */
describe("real classifier registry with multiple independent errors", () => {
  it("classifies a missing dependency and a missing shell command separately, in one capture", () => {
    const stderr = [
      "src/api.ts:3:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.",
      "zsh: command not found: vite",
    ].join("\n");

    const result = analyze({ command: "npm run build", exitCode: 1, stdout: "", stderr });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);

    const types = result.errors.map((error) => error.type).sort();
    expect(types).toEqual(["command_not_found", "missing_dependency"]);
  });
});

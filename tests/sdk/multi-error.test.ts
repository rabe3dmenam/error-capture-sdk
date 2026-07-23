import { describe, expect, it } from "vitest";
import { analyze } from "../../src/sdk/analyze.js";

/**
 * Unlike schema-example.test.ts (which proves exactly ONE classifier fires
 * on the documented example), this proves the real, fully-populated
 * registry (Phase 5) correctly separates TWO independent real problems in
 * one combined capture, without conflating or dropping either.
 */
describe("real classifier registry with multiple independent errors", () => {
  it("classifies a peer-dependency install failure and a tsc type error separately, in one capture", () => {
    const stderr = [
      "npm ERR! code ERESOLVE",
      "npm ERR! ERESOLVE unable to resolve dependency tree",
      "src/foo.ts(10,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
    ].join("\n");

    const result = analyze({ command: "npm run build", exitCode: 1, stdout: "", stderr });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);

    const types = result.errors.map((error) => error.type).sort();
    expect(types).toEqual(["install_failure", "type_error"]);
  });
});

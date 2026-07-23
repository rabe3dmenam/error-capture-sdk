import { describe, expect, it } from "vitest";
import { buildProHint } from "../../src/core/pro-hint.js";

describe("buildProHint", () => {
  it("hints type_error for a TS diagnostic code outside the free core's TS1xxx/TS2307 ranges", () => {
    const output = "src/index.ts:4:3 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.";

    expect(buildProHint(output)).toBe("This looks like a 'type_error', handled by the Pro package.");
  });

  it("hints port_in_use for EADDRINUSE", () => {
    const output = "node:events:496\n      throw er; // Unhandled 'error' event\nError: listen EADDRINUSE: address already in use :::3000";

    expect(buildProHint(output)).toBe("This looks like a 'port_in_use', handled by the Pro package.");
  });

  it("hints install_failure for npm ERR! with a peer-dependency conflict", () => {
    const output = [
      "npm ERR! code ERESOLVE",
      "npm ERR! ERESOLVE could not resolve",
      "npm ERR! peer dep missing: react@^18.0.0",
    ].join("\n");

    expect(buildProHint(output)).toBe("This looks like a 'install_failure', handled by the Pro package.");
  });

  it("does not hint on a plain failing npm script (ELIFECYCLE) with no install-specific context", () => {
    const output = "npm ERR! code ELIFECYCLE\nnpm ERR! Exit status 1";

    expect(buildProHint(output)).toBeNull();
  });

  it("returns null for genuinely unrecognized output", () => {
    const output = "boom: something broke in a way nothing recognizes";

    expect(buildProHint(output)).toBeNull();
  });

  it("prefers port_in_use over a coincidentally-present npm ERR! wrapper", () => {
    const output = [
      "npm ERR! code ELIFECYCLE",
      "Error: listen EADDRINUSE: address already in use :::3000",
    ].join("\n");

    expect(buildProHint(output)).toBe("This looks like a 'port_in_use', handled by the Pro package.");
  });
});

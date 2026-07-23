import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { portInUseClassifier } from "../../src/classifiers/port-in-use.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "npm run dev", exitCode: 1, stdout: "", stderr: "", ...overrides };
}

describe("portInUseClassifier", () => {
  it("matches the :::PORT form", () => {
    const input = rawResult({ stderr: "Error: listen EADDRINUSE: address already in use :::3000" });

    expect(portInUseClassifier.matches(input)).toBe(true);
    const [error] = portInUseClassifier.classify(input);

    expect(error).toMatchObject({
      type: "port_in_use",
      summary: "Port 3000 is already in use",
      file: null,
      line: null,
      column: null,
      details: { port: 3000 },
      classifier: "port_in_use@1",
    });
    expect(error?.suggestedFix).toContain("3000");
  });

  it("matches the IP:PORT form", () => {
    const input = rawResult({ stderr: "Error: listen EADDRINUSE: address already in use 127.0.0.1:8080" });

    const [error] = portInUseClassifier.classify(input);

    expect(error?.details).toEqual({ port: 8080 });
  });

  it("does not match unrelated output", () => {
    const input = rawResult({ stderr: "some other error entirely" });

    expect(portInUseClassifier.matches(input)).toBe(false);
  });
});

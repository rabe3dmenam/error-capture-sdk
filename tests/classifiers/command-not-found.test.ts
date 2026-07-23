import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { commandNotFoundClassifier } from "../../src/classifiers/command-not-found.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "vite build", exitCode: 127, stdout: "", stderr: "", ...overrides };
}

describe("commandNotFoundClassifier", () => {
  it("matches the zsh phrasing", () => {
    const input = rawResult({ stderr: "zsh: command not found: vite" });

    expect(commandNotFoundClassifier.matches(input)).toBe(true);
    const [error] = commandNotFoundClassifier.classify(input);

    expect(error).toMatchObject({
      type: "command_not_found",
      summary: "Command not found: vite",
      details: { binary: "vite" },
      classifier: "command_not_found@1",
    });
  });

  it("matches the bash phrasing", () => {
    const input = rawResult({ stderr: "bash: vite: command not found" });

    const [error] = commandNotFoundClassifier.classify(input);

    expect(error?.details).toEqual({ binary: "vite" });
  });

  it("matches the sh phrasing with a numeric line prefix", () => {
    const input = rawResult({ stderr: "sh: 1: vite: not found" });

    const [error] = commandNotFoundClassifier.classify(input);

    expect(error?.details).toEqual({ binary: "vite" });
  });

  it("matches bash's non-interactive script phrasing with a 'line N:' prefix (common in CI/Docker/npm scripts that shell out to a .sh file)", () => {
    const input = rawResult({ stderr: "build.sh: line 3: vite: command not found" });

    const [error] = commandNotFoundClassifier.classify(input);

    expect(error?.details).toEqual({ binary: "vite" });
  });

  it("does not double-classify the same line under both patterns", () => {
    const input = rawResult({ stderr: "zsh: command not found: vite" });

    expect(commandNotFoundClassifier.classify(input)).toHaveLength(1);
  });

  it("does not match unrelated output", () => {
    const input = rawResult({ stderr: "some other error entirely", exitCode: 1 });

    expect(commandNotFoundClassifier.matches(input)).toBe(false);
  });
});

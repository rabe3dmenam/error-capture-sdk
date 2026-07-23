import { describe, expect, it } from "vitest";
import type { RawResult } from "../../src/types/index.js";
import { installFailureClassifier } from "../../src/classifiers/install-failure.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return { command: "npm install", exitCode: 1, stdout: "", stderr: "", ...overrides };
}

describe("installFailureClassifier", () => {
  it("matches a peer dependency conflict (ERESOLVE)", () => {
    const stderr = [
      "npm ERR! code ERESOLVE",
      "npm ERR! ERESOLVE unable to resolve dependency tree",
      "npm ERR!",
      "npm ERR! peer react@\"^18.0.0\" from some-package@1.0.0",
    ].join("\n");
    const input = rawResult({ stderr });

    expect(installFailureClassifier.matches(input)).toBe(true);
    const [error] = installFailureClassifier.classify(input);

    expect(error).toMatchObject({
      type: "install_failure",
      details: { reason: "peer_dependency_conflict", message: "ERESOLVE unable to resolve dependency tree" },
      suggestedFix: null,
      classifier: "install_failure@1",
    });
  });

  it("matches a network error (ENOTFOUND)", () => {
    const stderr = [
      "npm ERR! code ENOTFOUND",
      "npm ERR! network request to https://registry.npmjs.org/axios failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org",
    ].join("\n");
    const input = rawResult({ stderr });

    const [error] = installFailureClassifier.classify(input);

    expect(error?.details).toMatchObject({ reason: "network_error" });
  });

  it("matches a package-not-found error (E404)", () => {
    const stderr = ["npm ERR! code E404", "npm ERR! 404 Not Found - GET https://registry.npmjs.org/does-not-exist - Not found"].join("\n");
    const input = rawResult({ stderr });

    const [error] = installFailureClassifier.classify(input);

    expect(error?.details).toMatchObject({ reason: "package_not_found" });
  });

  it("picks the LAST whitelisted npm ERR! block when multiple appear (the terminal failure, not an earlier transient one)", () => {
    const stderr = [
      "npm ERR! code ETIMEDOUT",
      "npm ERR! network timeout, retrying",
      "npm ERR! code ERESOLVE",
      "npm ERR! ERESOLVE unable to resolve dependency tree",
    ].join("\n");
    const input = rawResult({ stderr });

    const [error] = installFailureClassifier.classify(input);

    expect(error?.details).toMatchObject({ reason: "peer_dependency_conflict" });
  });

  it("falls back to the code line itself when no adjacent npm ERR! message line exists", () => {
    const input = rawResult({ stderr: "npm ERR! code ERESOLVE" });

    const [error] = installFailureClassifier.classify(input);

    expect(error?.details).toEqual({ reason: "peer_dependency_conflict", message: "npm ERR! code ERESOLVE" });
  });

  it("does NOT match ELIFECYCLE (a script failure, not an install failure) — regression for the ERROR_SCHEMA.md section 6 example", () => {
    const input = rawResult({ command: "npm run build", stderr: "npm ERR! code ELIFECYCLE\nnpm ERR! app@1.0.0 build: `tsc && vite build`" });

    expect(installFailureClassifier.matches(input)).toBe(false);
    expect(installFailureClassifier.classify(input)).toEqual([]);
  });

  it("does not match output with no npm ERR! lines at all", () => {
    const input = rawResult({ stdout: "added 42 packages in 3s", stderr: "" });

    expect(installFailureClassifier.matches(input)).toBe(false);
  });

  it("matches npm 9+'s real error format — lowercase 'npm error', no '!' — verified against actual npm 10.9.2 output (`npm install <nonexistent-package>`)", () => {
    const stderr = [
      "npm error code E404",
      "npm error 404 Not Found - GET https://registry.npmjs.org/this-package-definitely-does-not-exist-xyz-987654 - Not found",
      "npm error 404",
      "npm error 404  'this-package-definitely-does-not-exist-xyz-987654@*' is not in this registry.",
    ].join("\n");
    const input = rawResult({ stderr });

    expect(installFailureClassifier.matches(input)).toBe(true);
    const [error] = installFailureClassifier.classify(input);

    expect(error?.details).toMatchObject({ reason: "package_not_found" });
  });

  it("matches npm 9+'s real ERESOLVE format too", () => {
    const stderr = ["npm error code ERESOLVE", "npm error ERESOLVE unable to resolve dependency tree"].join("\n");
    const input = rawResult({ stderr });

    const [error] = installFailureClassifier.classify(input);

    expect(error?.details).toMatchObject({ reason: "peer_dependency_conflict" });
  });

  it("does NOT match 'npm error code ELIFECYCLE' either (same script-failure exclusion, new prefix)", () => {
    const input = rawResult({ stderr: "npm error code ELIFECYCLE\nnpm error app@1.0.0 build: `tsc && vite build`" });

    expect(installFailureClassifier.matches(input)).toBe(false);
  });
});

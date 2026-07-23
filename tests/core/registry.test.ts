import { describe, expect, it, vi } from "vitest";
import type { Classifier, RawResult, StructuredError } from "../../src/types/index.js";
import { runClassifiers } from "../../src/core/registry.js";

function rawResult(overrides: Partial<RawResult> = {}): RawResult {
  return {
    command: "npm run build",
    exitCode: 1,
    stdout: "",
    stderr: "",
    ...overrides,
  };
}

function fakeError(overrides: Partial<StructuredError> = {}): StructuredError {
  return {
    type: "missing_dependency",
    summary: "fake error",
    file: null,
    line: null,
    column: null,
    details: { package: "fake-package" },
    suggestedFix: null,
    confidence: 0.9,
    classifier: "fake@1",
    rawExcerpt: "fake",
    ...overrides,
  } as StructuredError;
}

function fakeClassifier(name: string, matches: boolean, errors: StructuredError[]): Classifier {
  return {
    name,
    matches: vi.fn(() => matches),
    classify: vi.fn(() => errors),
  };
}

describe("runClassifiers", () => {
  it("returns errors from a matching classifier", () => {
    const error = fakeError();
    const classifier = fakeClassifier("fake@1", true, [error]);

    const result = runClassifiers([classifier], rawResult());

    expect(result).toEqual([error]);
  });

  it("never calls classify() on a classifier whose matches() returns false", () => {
    const matches = vi.fn(() => false);
    const classify = vi.fn((): StructuredError[] => [fakeError()]);
    const classifier: Classifier = { name: "fake@1", matches, classify };

    runClassifiers([classifier], rawResult());

    expect(matches).toHaveBeenCalledOnce();
    expect(classify).not.toHaveBeenCalled();
  });

  it("flattens results across multiple matching classifiers", () => {
    const errorA = fakeError({ classifier: "fake-a@1" });
    const errorB = fakeError({ classifier: "fake-b@1" });
    const classifierA = fakeClassifier("fake-a@1", true, [errorA]);
    const classifierB = fakeClassifier("fake-b@1", true, [errorB]);

    const result = runClassifiers([classifierA, classifierB], rawResult());

    expect(result).toEqual([errorA, errorB]);
  });

  it("falls back to unknown_error when nothing matches a failed command", () => {
    const classifier = fakeClassifier("fake@1", false, []);

    const result = runClassifiers([classifier], rawResult({ exitCode: 1, stderr: "boom: something broke" }));

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("unknown_error");
  });

  it("falls back to unknown_error when a matching classifier produces no errors", () => {
    const classifier = fakeClassifier("fake@1", true, []);

    const result = runClassifiers([classifier], rawResult({ exitCode: 1, stderr: "boom: something broke" }));

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("unknown_error");
  });

  it("ignores errors from a classifier that matches on a successful command", () => {
    const classifier = fakeClassifier("fake@1", true, [fakeError()]);

    const result = runClassifiers([classifier], rawResult({ exitCode: 0 }));

    expect(result).toEqual([]);
  });

  it("returns an empty array when nothing matches a successful command", () => {
    const classifier = fakeClassifier("fake@1", false, []);

    const result = runClassifiers([classifier], rawResult({ exitCode: 0 }));

    expect(result).toEqual([]);
  });

  it("treats a null exit code as a failure for fallback purposes", () => {
    const result = runClassifiers([], rawResult({ exitCode: null }));

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("unknown_error");
  });
});

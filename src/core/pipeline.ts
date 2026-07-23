import type { CaptureResult, RawResult } from "../types/index.js";
import { classifiers } from "../classifiers/index.js";
import { buildCaptureResult } from "./build-capture-result.js";
import { runClassifiers } from "./registry.js";

/**
 * The full capture -> parse -> classify -> output pipeline
 * (PROJECT_BRIEF.md section 1), minus execution: takes a RawResult, runs it
 * through the registered classifiers, and assembles the CaptureResult. This
 * is what both `analyze()` and `capture()` share, so the classify logic is
 * never duplicated (SDK_API.md section 3).
 */
export function analyzeRawResult(input: RawResult): CaptureResult {
  const errors = runClassifiers(classifiers, input);
  return buildCaptureResult(input, errors);
}

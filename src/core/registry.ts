import type { Classifier, RawResult, StructuredError } from "../types/index.js";
import { buildUnknownError } from "./unknown-error.js";

/**
 * The core pipeline's classify step (PROJECT_BRIEF.md section 4.3 "boring
 * core"): run each registered classifier's matches() -> classify(), flatten
 * the results, and guarantee the unknown_error fallback fires when nothing
 * matches a failed command (ERROR_SCHEMA.md section 4.8).
 *
 * ERROR_SCHEMA.md section 2 requires `errors` to be empty whenever the
 * command succeeded — enforced here rather than left to classifier authors,
 * so a classifier that mistakenly matches on a successful run can't violate
 * the CaptureResult contract.
 */
export function runClassifiers(classifiers: readonly Classifier[], input: RawResult): StructuredError[] {
  const commandFailed = input.exitCode !== 0;
  if (!commandFailed) {
    return [];
  }

  const errors = classifiers.filter((classifier) => classifier.matches(input)).flatMap((classifier) => classifier.classify(input));

  return errors.length === 0 ? [buildUnknownError(input)] : errors;
}

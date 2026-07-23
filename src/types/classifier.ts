import type { RawResult } from "./raw-result.js";
import type { StructuredError } from "./structured-error.js";

/**
 * The shared contract every error-type handler implements (SDK_API.md
 * section 6). Lives in /types — not /core — so classifiers can implement it
 * without depending on the core pipeline (see .dependency-cruiser.cjs).
 */
export interface Classifier {
  /** Stable name + version, e.g. "missing_dependency@1". */
  readonly name: string;
  /** Cheap check: could this classifier possibly apply to this output? */
  matches(input: RawResult): boolean;
  /** Produce zero or more StructuredErrors from the output. */
  classify(input: RawResult): StructuredError[];
}

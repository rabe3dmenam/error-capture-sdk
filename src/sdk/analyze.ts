import { analyzeRawResult } from "../core/index.js";
import type { AnalyzeOptions, CaptureResult, RawResult } from "../types/index.js";

/**
 * Pure transformation: RawResult -> CaptureResult (SDK_API.md section 3).
 * No execution, no I/O — synchronous and decoupled from `capture()`.
 * `_options` is reserved for future use; keep it empty in v1.
 */
export function analyze(input: RawResult, _options?: AnalyzeOptions): CaptureResult {
  return analyzeRawResult(input);
}

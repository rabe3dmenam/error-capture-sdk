/**
 * The public SDK surface (SDK_API.md section 5). `CaptureOptions` and
 * `AnalyzeOptions` are exported in addition to the section 5 list because
 * they're part of `capture()`/`analyze()`'s own public signatures (section
 * 4) — consumers need to be able to name them. `Classifier` and
 * `UsageError` stay internal (see DECISIONS.md).
 */
export type { AnalyzeOptions, CaptureOptions, CaptureResult, ErrorType, RawResult, StructuredError } from "../types/index.js";
export { analyze } from "./analyze.js";
export { capture } from "./capture.js";

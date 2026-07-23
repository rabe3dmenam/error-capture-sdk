/**
 * Options for `capture()` (SDK_API.md section 4). Kept deliberately minimal —
 * every option is a maintenance cost; add one only when a real use case
 * demands it.
 */
export interface CaptureOptions {
  /** Working directory for the command. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Kill the command after N ms. Defaults to no timeout. */
  timeoutMs?: number;
  /** Extra environment variables for the command. */
  env?: Record<string, string>;
}

/**
 * Options for `analyze()`. Reserved for future use — keep empty in v1
 * unless a real need appears (SDK_API.md section 4).
 */
export type AnalyzeOptions = Record<string, never>;

import type { StructuredError } from "./structured-error.js";

/**
 * The single, predictable return shape of the SDK (ERROR_SCHEMA.md section 2).
 * Same shape whether the command succeeded or failed.
 */
export interface CaptureResult {
  /** `true` if `exitCode === 0`, else `false`. */
  success: boolean;
  /** The exact command string that was executed. */
  command: string;
  /** Process exit code. `null` if it never exited. */
  exitCode: number | null;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** Parsed errors. Empty array when `success` is true. */
  errors: StructuredError[];
  /** The untouched original output. Always included — never dropped. */
  raw: {
    stdout: string;
    stderr: string;
  };
}

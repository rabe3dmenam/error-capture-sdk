import type { CaptureResult, RawResult, StructuredError } from "../types/index.js";

/**
 * Assembles the final CaptureResult (ERROR_SCHEMA.md section 2) from a
 * RawResult and its already-classified errors. `durationMs` defaults to 0
 * when the caller didn't supply one — see DECISIONS.md.
 */
export function buildCaptureResult(input: RawResult, errors: StructuredError[]): CaptureResult {
  return {
    success: input.exitCode === 0,
    command: input.command,
    exitCode: input.exitCode,
    durationMs: input.durationMs ?? 0,
    errors,
    raw: {
      stdout: input.stdout,
      stderr: input.stderr,
    },
  };
}

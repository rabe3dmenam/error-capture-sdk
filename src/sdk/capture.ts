import { exec } from "node:child_process";
import type { CaptureOptions, CaptureResult, RawResult } from "../types/index.js";
import { analyze } from "./analyze.js";
import { UsageError } from "./usage-error.js";

// Node's exec() default maxBuffer is 1MB, which silently truncates stdout/stderr
// and surfaces as exitCode: null — indistinguishable from a timeoutMs kill. npm
// install/build/test output routinely exceeds 1MB, so raise the cap well above
// what a normal command produces. See DECISIONS.md.
const MAX_OUTPUT_BUFFER_BYTES = 20 * 1024 * 1024;

function runCommand(command: string, options: CaptureOptions): Promise<RawResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const env = options.env === undefined ? undefined : { ...process.env, ...options.env };

    exec(command, { cwd: options.cwd, env, timeout: options.timeoutMs, maxBuffer: MAX_OUTPUT_BUFFER_BYTES }, (error, stdout, stderr) => {
      const exitCode = error === null ? 0 : typeof error.code === "number" ? error.code : null;

      resolve({
        command,
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

/**
 * Runs `command`, captures stdout/stderr/exitCode, and returns the same
 * CaptureResult shape as `analyze()` (SDK_API.md section 2). Never rejects
 * for a command that ran and failed — only for usage errors, e.g. an empty
 * command string.
 *
 * Internally: run the command -> build a RawResult -> call `analyze()`.
 * They share the same core; the classify logic is never duplicated.
 */
export async function capture(command: string, options: CaptureOptions = {}): Promise<CaptureResult> {
  if (command.trim() === "") {
    throw new UsageError("capture() requires a non-empty command string");
  }

  const raw = await runCommand(command, options);
  return analyze(raw);
}

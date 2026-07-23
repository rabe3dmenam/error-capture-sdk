/**
 * The unclassified output of a command, as consumed by `analyze()`
 * (SDK_API.md section 3). `capture()` builds this internally after running
 * the command, then hands it to `analyze()` — the two share this contract
 * so the classify pipeline stays decoupled from execution.
 *
 * `durationMs` is optional here: callers who already ran the command
 * themselves (the `analyze()` path) may not know it. `capture()` always
 * fills it in; `analyze()` defaults it to 0 when absent. See DECISIONS.md.
 */
export interface RawResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs?: number;
}

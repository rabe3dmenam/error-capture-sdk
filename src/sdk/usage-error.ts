/**
 * Thrown when `capture()` is called with invalid arguments (e.g. an empty
 * command string) — never for a command that ran and failed. SDK_API.md
 * section 2: "It only throws for usage errors... those are UsageErrors."
 * Not part of the public export list (SDK_API.md section 5); consumers can
 * still distinguish it via `error.name === "UsageError"`. See DECISIONS.md.
 */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

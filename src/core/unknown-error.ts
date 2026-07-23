import type { RawResult, StructuredError } from "../types/index.js";
import { buildProHint } from "./pro-hint.js";

const EXCERPT_MAX_LENGTH = 500;

function pickSource(input: RawResult): string {
  const stderr = input.stderr.trim();
  return stderr.length > 0 ? stderr : input.stdout.trim();
}

function summarize(source: string, exitCode: number | null): string {
  const firstLine = source.split("\n").find((line) => line.trim().length > 0);
  if (firstLine !== undefined) return firstLine.trim();
  const exitCodeLabel = exitCode === null ? "unknown" : String(exitCode);
  return `Command exited with code ${exitCodeLabel}`;
}

/**
 * The safety net (ERROR_SCHEMA.md section 4.8): every failed command must
 * produce at least one StructuredError. When no registered classifier
 * matches, the registry falls back to this.
 */
export function buildUnknownError(input: RawResult): StructuredError {
  const source = pickSource(input);

  return {
    type: "unknown_error",
    summary: summarize(source, input.exitCode),
    file: null,
    line: null,
    column: null,
    details: {},
    suggestedFix: null,
    confidence: 0.2,
    classifier: "unknown_error@1",
    rawExcerpt: source.slice(0, EXCERPT_MAX_LENGTH),
    proHint: buildProHint(`${input.stdout}\n${input.stderr}`),
  };
}

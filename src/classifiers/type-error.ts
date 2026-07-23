import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * type_error (ERROR_SCHEMA.md section 4.3): a TypeScript semantic
 * diagnostic (tsc's "TS2xxx" family), excluding TS2307 ("Cannot find
 * module"), which belongs to missing_dependency/module_not_found
 * (sections 4.1/4.4) — this must not double-classify that line.
 *
 * Handles both of tsc's diagnostic formats: the "pretty" one (only emitted
 * with --pretty or a real TTY) and the plain default it actually uses when
 * run non-interactively — which is how capture() always invokes commands,
 * via a piped child_process, never a TTY.
 */

const TS_DIAGNOSTIC_PRETTY = /^(.+):(\d+):(\d+) - error (TS\d+): (.+)$/gm;
const TS_DIAGNOSTIC_PLAIN = /^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;

interface ParsedMatch {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  rawExcerpt: string;
}

function isTypeErrorCode(code: string): boolean {
  return code.startsWith("TS2") && code !== "TS2307";
}

function collectTsDiagnosticMatches(output: string, pattern: RegExp): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  for (const match of output.matchAll(pattern)) {
    const [rawExcerpt, file, line, column, code, message] = match;
    if (file === undefined || line === undefined || column === undefined || code === undefined || message === undefined) continue;
    if (!isTypeErrorCode(code)) continue;
    matches.push({ file, line: Number(line), column: Number(column), code, message: message.trim(), rawExcerpt: rawExcerpt.trim() });
  }
  return matches;
}

function findMatches(input: RawResult): ParsedMatch[] {
  const output = `${input.stdout}\n${input.stderr}`;
  return [...collectTsDiagnosticMatches(output, TS_DIAGNOSTIC_PRETTY), ...collectTsDiagnosticMatches(output, TS_DIAGNOSTIC_PLAIN)];
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "type_error",
    summary: match.message,
    file: match.file,
    line: match.line,
    column: match.column,
    details: { code: match.code, message: match.message },
    suggestedFix: null,
    confidence: 0.85,
    classifier: "type_error@1",
    rawExcerpt: match.rawExcerpt,
  };
}

export const typeErrorClassifier: Classifier = {
  name: "type_error@1",
  matches(input: RawResult): boolean {
    return findMatches(input).length > 0;
  },
  classify(input: RawResult): StructuredError[] {
    return findMatches(input).map(toStructuredError);
  },
};

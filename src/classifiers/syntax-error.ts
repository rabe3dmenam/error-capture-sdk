import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * syntax_error (ERROR_SCHEMA.md section 4.2): invalid syntax in a source
 * file. Handles three real sources:
 *   - tsc's "TS1xxx" family, "pretty" format (only emitted with --pretty
 *     or a real TTY)
 *   - tsc's "TS1xxx" family, plain default format — what tsc actually
 *     produces when run non-interactively, which is how capture() always
 *     invokes commands, via a piped child_process, never a TTY
 *   - plain Node's thrown `SyntaxError: <message>` — Node doesn't print a
 *     reliable file/line header alongside it, so those fields stay null;
 *     honest per ERROR_SCHEMA.md section 5 rule 4 rather than guessed.
 */

const TS_DIAGNOSTIC_PRETTY = /^(.+):(\d+):(\d+) - error (TS\d+): (.+)$/gm;
const TS_DIAGNOSTIC_PLAIN = /^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
const NODE_SYNTAX_ERROR = /^SyntaxError: (.+)$/gm;

interface ParsedMatch {
  file: string | null;
  line: number | null;
  column: number | null;
  message: string;
  rawExcerpt: string;
  confidence: number;
}

function collectTsDiagnosticMatches(output: string, pattern: RegExp): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  for (const match of output.matchAll(pattern)) {
    const [rawExcerpt, file, line, column, code, message] = match;
    if (file === undefined || line === undefined || column === undefined || code === undefined || message === undefined) continue;
    if (!code.startsWith("TS1")) continue;
    matches.push({
      file,
      line: Number(line),
      column: Number(column),
      message: message.trim(),
      rawExcerpt: rawExcerpt.trim(),
      confidence: 0.85,
    });
  }
  return matches;
}

function findMatches(input: RawResult): ParsedMatch[] {
  const output = `${input.stdout}\n${input.stderr}`;
  const matches: ParsedMatch[] = [
    ...collectTsDiagnosticMatches(output, TS_DIAGNOSTIC_PRETTY),
    ...collectTsDiagnosticMatches(output, TS_DIAGNOSTIC_PLAIN),
  ];

  for (const match of output.matchAll(NODE_SYNTAX_ERROR)) {
    const [rawExcerpt, message] = match;
    if (message === undefined) continue;
    matches.push({ file: null, line: null, column: null, message: message.trim(), rawExcerpt: rawExcerpt.trim(), confidence: 0.6 });
  }

  return matches;
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "syntax_error",
    summary: match.message,
    file: match.file,
    line: match.line,
    column: match.column,
    details: { message: match.message },
    suggestedFix: null,
    confidence: match.confidence,
    classifier: "syntax_error@1",
    rawExcerpt: match.rawExcerpt,
    proHint: null,
  };
}

export const syntaxErrorClassifier: Classifier = {
  name: "syntax_error@1",
  matches(input: RawResult): boolean {
    return findMatches(input).length > 0;
  },
  classify(input: RawResult): StructuredError[] {
    return findMatches(input).map(toStructuredError);
  },
};

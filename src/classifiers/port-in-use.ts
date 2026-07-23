import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * port_in_use (ERROR_SCHEMA.md section 4.5): the app tried to bind a port
 * that's already taken. Handles Node's `EADDRINUSE` in both its `:::PORT`
 * (any-interface, IPv6-style) and `IP:PORT` forms.
 */

const EADDRINUSE = /EADDRINUSE.*?:(\d+)\s*$/m;

interface ParsedMatch {
  port: number;
  rawExcerpt: string;
}

function findMatch(input: RawResult): ParsedMatch | null {
  const output = `${input.stdout}\n${input.stderr}`;
  const match = EADDRINUSE.exec(output);
  if (match === null) return null;

  const [rawExcerpt, portText] = match;
  if (portText === undefined) return null;

  return { port: Number(portText), rawExcerpt: rawExcerpt.trim() };
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "port_in_use",
    summary: `Port ${String(match.port)} is already in use`,
    file: null,
    line: null,
    column: null,
    details: { port: match.port },
    suggestedFix: `Stop the process already using port ${String(match.port)}, or run on a different port`,
    confidence: 0.9,
    classifier: "port_in_use@1",
    rawExcerpt: match.rawExcerpt,
  };
}

export const portInUseClassifier: Classifier = {
  name: "port_in_use@1",
  matches(input: RawResult): boolean {
    return findMatch(input) !== null;
  },
  classify(input: RawResult): StructuredError[] {
    const match = findMatch(input);
    return match === null ? [] : [toStructuredError(match)];
  },
};

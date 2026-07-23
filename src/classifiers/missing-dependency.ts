import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * missing_dependency (ERROR_SCHEMA.md section 4.1): a bare package
 * specifier (not a relative/absolute path) that couldn't be resolved.
 * Handles three real-world sources:
 *   - tsc "pretty" diagnostics (only emitted with --pretty or a real TTY):
 *     `file.ts:L:C - error TS2307: Cannot find module 'pkg'...`
 *   - tsc's actual default when run non-interactively — which is how
 *     capture() always invokes commands, via a piped child_process, never
 *     a TTY: `file.ts(L,C): error TS2307: Cannot find module 'pkg'...`
 *   - plain Node require/import (CJS): `Error: Cannot find module 'pkg'`,
 *     with an optional "Require stack:" line naming the requiring file.
 *   - Node's ESM loader: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package
 *     'pkg' imported from /path/to/file.js` — distinct wording ("package",
 *     not "module") from the ESM loader's module_not_found equivalent, see
 *     module-not-found.ts.
 * A relative specifier is module_not_found's job (section 4.4), not this
 * classifier's — see module-not-found.ts. The two files share this shape
 * of parsing logic but stay separate, self-contained files: dependency-
 * cruiser forbids classifiers importing each other, so a small amount of
 * duplication here is an accepted trade-off — see DECISIONS.md.
 */

const TS_DIAGNOSTIC_PRETTY = /^(.+):(\d+):(\d+) - error TS2307: Cannot find module '([^']+)'.*$/gm;
const TS_DIAGNOSTIC_PLAIN = /^(.+)\((\d+),(\d+)\): error TS2307: Cannot find module '([^']+)'.*$/gm;
// The require-stack line is captured in the SAME match as its error, not
// found via a separate global scan — with two require failures in one
// capture, a second scan would always re-find the first stack block.
const NODE_REQUIRE_ERROR = /^Error: Cannot find module '([^']+)'(?:\nRequire stack:\n- (.+))?$/gm;
const ESM_PACKAGE_NOT_FOUND = /^Error \[ERR_MODULE_NOT_FOUND\]: Cannot find package '([^']+)' imported from (.+)$/gm;

interface ParsedMatch {
  specifier: string;
  file: string | null;
  line: number | null;
  column: number | null;
  rawExcerpt: string;
  confidence: number;
}

function isBareSpecifier(specifier: string): boolean {
  return !specifier.startsWith(".") && !specifier.startsWith("/");
}

function packageNameFromSpecifier(specifier: string): string {
  const segments = specifier.split("/");
  if (specifier.startsWith("@") && segments.length >= 2) {
    return `${segments[0] ?? ""}/${segments[1] ?? ""}`;
  }
  return segments[0] ?? specifier;
}

function collectTsDiagnosticMatches(output: string, pattern: RegExp): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  for (const match of output.matchAll(pattern)) {
    const [rawExcerpt, file, line, column, specifier] = match;
    if (file === undefined || line === undefined || column === undefined || specifier === undefined) continue;
    if (!isBareSpecifier(specifier)) continue;
    matches.push({ specifier, file, line: Number(line), column: Number(column), rawExcerpt: rawExcerpt.trim(), confidence: 0.92 });
  }
  return matches;
}

function findMatches(input: RawResult): ParsedMatch[] {
  const output = `${input.stdout}\n${input.stderr}`;
  const matches: ParsedMatch[] = [
    ...collectTsDiagnosticMatches(output, TS_DIAGNOSTIC_PRETTY),
    ...collectTsDiagnosticMatches(output, TS_DIAGNOSTIC_PLAIN),
  ];

  for (const match of output.matchAll(NODE_REQUIRE_ERROR)) {
    const [rawExcerpt, specifier, file] = match;
    if (specifier === undefined || !isBareSpecifier(specifier)) continue;
    matches.push({
      specifier,
      file: file?.trim() ?? null,
      line: null,
      column: null,
      rawExcerpt: rawExcerpt.trim(),
      confidence: 0.8,
    });
  }

  for (const match of output.matchAll(ESM_PACKAGE_NOT_FOUND)) {
    const [rawExcerpt, specifier, file] = match;
    if (specifier === undefined || file === undefined || !isBareSpecifier(specifier)) continue;
    matches.push({
      specifier,
      file: file.trim(),
      line: null,
      column: null,
      rawExcerpt: rawExcerpt.trim(),
      confidence: 0.85,
    });
  }

  return matches;
}

function toStructuredError(match: ParsedMatch): StructuredError {
  const packageName = packageNameFromSpecifier(match.specifier);
  return {
    type: "missing_dependency",
    summary: `Module '${packageName}' is not installed`,
    file: match.file,
    line: match.line,
    column: match.column,
    details: { package: packageName },
    suggestedFix: `npm install ${packageName}`,
    confidence: match.confidence,
    classifier: "missing_dependency@1",
    rawExcerpt: match.rawExcerpt,
    proHint: null,
  };
}

export const missingDependencyClassifier: Classifier = {
  name: "missing_dependency@1",
  matches(input: RawResult): boolean {
    return findMatches(input).length > 0;
  },
  classify(input: RawResult): StructuredError[] {
    return findMatches(input).map(toStructuredError);
  },
};

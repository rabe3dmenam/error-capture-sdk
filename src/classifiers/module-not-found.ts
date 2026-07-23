import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * module_not_found (ERROR_SCHEMA.md section 4.4): a relative/absolute
 * import path that couldn't be resolved — distinct from missing_dependency
 * (section 4.1), which owns bare package specifiers. Handles both of tsc's
 * diagnostic formats: the "pretty" one (only emitted with --pretty or a
 * real TTY) and the plain default it actually uses when run
 * non-interactively — which is how capture() always invokes commands, via
 * a piped child_process, never a TTY. Also handles Node's ESM loader form:
 * `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/abs/path.js' imported
 * from /path/to/file.js` — distinct wording ("module", not "package") from
 * the ESM loader's missing_dependency equivalent, see missing-dependency.ts.
 * Mirrors missing-dependency.ts's parsing shape; kept as a separate, self-contained file per the
 * classifier-isolation boundary (dependency-cruiser forbids classifiers
 * importing each other) — see DECISIONS.md.
 */

const TS_DIAGNOSTIC_PRETTY = /^(.+):(\d+):(\d+) - error TS2307: Cannot find module '([^']+)'.*$/gm;
const TS_DIAGNOSTIC_PLAIN = /^(.+)\((\d+),(\d+)\): error TS2307: Cannot find module '([^']+)'.*$/gm;
// The require-stack line is captured in the SAME match as its error, not
// found via a separate global scan — with two require failures in one
// capture, a second scan would always re-find the first stack block.
const NODE_REQUIRE_ERROR = /^Error: Cannot find module '([^']+)'(?:\nRequire stack:\n- (.+))?$/gm;
const ESM_MODULE_NOT_FOUND = /^Error \[ERR_MODULE_NOT_FOUND\]: Cannot find module '([^']+)' imported from (.+)$/gm;

interface ParsedMatch {
  importPath: string;
  file: string | null;
  line: number | null;
  column: number | null;
  rawExcerpt: string;
  confidence: number;
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("/");
}

function collectTsDiagnosticMatches(output: string, pattern: RegExp): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  for (const match of output.matchAll(pattern)) {
    const [rawExcerpt, file, line, column, importPath] = match;
    if (file === undefined || line === undefined || column === undefined || importPath === undefined) continue;
    if (!isRelativeSpecifier(importPath)) continue;
    matches.push({ importPath, file, line: Number(line), column: Number(column), rawExcerpt: rawExcerpt.trim(), confidence: 0.9 });
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
    const [rawExcerpt, importPath, file] = match;
    if (importPath === undefined || !isRelativeSpecifier(importPath)) continue;
    matches.push({
      importPath,
      file: file?.trim() ?? null,
      line: null,
      column: null,
      rawExcerpt: rawExcerpt.trim(),
      confidence: 0.75,
    });
  }

  for (const match of output.matchAll(ESM_MODULE_NOT_FOUND)) {
    const [rawExcerpt, importPath, file] = match;
    if (importPath === undefined || file === undefined || !isRelativeSpecifier(importPath)) continue;
    matches.push({
      importPath,
      file: file.trim(),
      line: null,
      column: null,
      rawExcerpt: rawExcerpt.trim(),
      confidence: 0.8,
    });
  }

  return matches;
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "module_not_found",
    summary: `Cannot resolve import '${match.importPath}'`,
    file: match.file,
    line: match.line,
    column: match.column,
    details: { importPath: match.importPath },
    suggestedFix: null,
    confidence: match.confidence,
    classifier: "module_not_found@1",
    rawExcerpt: match.rawExcerpt,
    proHint: null,
  };
}

export const moduleNotFoundClassifier: Classifier = {
  name: "module_not_found@1",
  matches(input: RawResult): boolean {
    return findMatches(input).length > 0;
  },
  classify(input: RawResult): StructuredError[] {
    return findMatches(input).map(toStructuredError);
  },
};

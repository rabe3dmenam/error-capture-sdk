import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * install_failure (ERROR_SCHEMA.md section 4.7): `npm install` failed for
 * an install-specific reason (network, peer-dep conflict, registry error).
 * Deliberately whitelists known install-failure codes rather than matching
 * any npm error line, so this does NOT fire on unrelated npm errors like
 * ELIFECYCLE (a lifecycle script exited non-zero for any reason) — which
 * appears in ERROR_SCHEMA.md section 6's own end-to-end example, where the
 * correct classification is missing_dependency alone.
 *
 * Handles both of npm's error-line prefixes: `npm ERR!` (older npm, and
 * the literal text of ERROR_SCHEMA.md's own section 6 example) and
 * `npm error` (npm 9+, lowercase, no "!" — what the npm actually bundled
 * with any current Node 18+ install emits; verified against a real `npm
 * install` of a nonexistent package). Missing this second format entirely
 * would mean this classifier never fires against a real current npm.
 *
 * Each "code" line is paired with its OWN immediately-following message
 * line in a single match (not a separate global scan for "the" message —
 * with two npm error blocks in one output, that would always pick the
 * first block's message regardless of which code it belongs to). When
 * multiple whitelisted blocks appear, the LAST one wins, on the theory
 * that it's more likely the terminal failure than an earlier transient one.
 */

const NPM_ERR_CODE_WITH_MESSAGE = /^npm (?:ERR!|error) code (\S+)\nnpm (?:ERR!|error) (.+)$/gm;
const NPM_ERR_CODE_ONLY = /^npm (?:ERR!|error) code (\S+)$/gm;

const INSTALL_FAILURE_REASONS: Readonly<Record<string, string>> = {
  ERESOLVE: "peer_dependency_conflict",
  ENOTFOUND: "network_error",
  ECONNREFUSED: "network_error",
  ETIMEDOUT: "network_error",
  EAI_AGAIN: "network_error",
  E404: "package_not_found",
  E401: "registry_auth_error",
  E403: "registry_auth_error",
  ETARGET: "no_matching_version",
};

interface ParsedMatch {
  reason: string;
  message: string;
  rawExcerpt: string;
}

function findMatch(input: RawResult): ParsedMatch | null {
  const output = `${input.stdout}\n${input.stderr}`;

  let lastMatch: ParsedMatch | null = null;
  for (const match of output.matchAll(NPM_ERR_CODE_WITH_MESSAGE)) {
    const [rawExcerpt, code, message] = match;
    if (code === undefined || message === undefined) continue;
    const reason = INSTALL_FAILURE_REASONS[code];
    if (reason === undefined) continue;
    lastMatch = { reason, message: message.trim(), rawExcerpt: rawExcerpt.trim() };
  }
  if (lastMatch !== null) return lastMatch;

  // Fallback: a whitelisted code with no adjacent "npm ERR! <message>" line.
  for (const match of output.matchAll(NPM_ERR_CODE_ONLY)) {
    const [rawExcerpt, code] = match;
    if (code === undefined) continue;
    const reason = INSTALL_FAILURE_REASONS[code];
    if (reason === undefined) continue;
    lastMatch = { reason, message: rawExcerpt.trim(), rawExcerpt: rawExcerpt.trim() };
  }
  return lastMatch;
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "install_failure",
    summary: match.message,
    file: null,
    line: null,
    column: null,
    details: { reason: match.reason, message: match.message },
    suggestedFix: null,
    confidence: 0.85,
    classifier: "install_failure@1",
    rawExcerpt: match.rawExcerpt,
  };
}

export const installFailureClassifier: Classifier = {
  name: "install_failure@1",
  matches(input: RawResult): boolean {
    return findMatch(input) !== null;
  },
  classify(input: RawResult): StructuredError[] {
    const match = findMatch(input);
    return match === null ? [] : [toStructuredError(match)];
  },
};

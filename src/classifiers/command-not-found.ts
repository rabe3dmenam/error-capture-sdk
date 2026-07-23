import type { Classifier, RawResult, StructuredError } from "../types/index.js";

/**
 * command_not_found (ERROR_SCHEMA.md section 4.6): a shell command/binary
 * doesn't exist. Handles the common POSIX shell phrasings:
 *   - zsh: `zsh: command not found: vite`
 *   - bash/sh: `bash: vite: command not found` / `sh: 1: vite: not found`
 *   - bash running a script non-interactively (very common in CI/Docker/npm
 *     scripts that shell out to a .sh file): `build.sh: line 3: vite:
 *     command not found`
 */

const ZSH_STYLE = /(?:^|: )command not found: (\S+)\s*$/m;
const BASH_STYLE = /^\S+: (?:line \d+: |\d+: )?(\S+): (?:command )?not found\s*$/m;

interface ParsedMatch {
  binary: string;
  rawExcerpt: string;
}

function findMatches(input: RawResult): ParsedMatch[] {
  const output = `${input.stdout}\n${input.stderr}`;
  const matches: ParsedMatch[] = [];

  const zshMatch = ZSH_STYLE.exec(output);
  if (zshMatch?.[1] !== undefined) {
    matches.push({ binary: zshMatch[1], rawExcerpt: zshMatch[0].trim() });
  }

  const bashMatch = BASH_STYLE.exec(output);
  if (bashMatch?.[1] !== undefined) {
    matches.push({ binary: bashMatch[1], rawExcerpt: bashMatch[0].trim() });
  }

  return matches;
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "command_not_found",
    summary: `Command not found: ${match.binary}`,
    file: null,
    line: null,
    column: null,
    details: { binary: match.binary },
    suggestedFix: `Install ${match.binary} (add it as a project dependency, or install it globally)`,
    confidence: 0.85,
    classifier: "command_not_found@1",
    rawExcerpt: match.rawExcerpt,
  };
}

export const commandNotFoundClassifier: Classifier = {
  name: "command_not_found@1",
  matches(input: RawResult): boolean {
    return findMatches(input).length > 0;
  },
  classify(input: RawResult): StructuredError[] {
    return findMatches(input).map(toStructuredError);
  },
};

/**
 * A lightweight, best-effort signal for whether an otherwise-unclassified
 * failure looks like one of the Pro-tier error types (`type_error`,
 * `install_failure`, `port_in_use`) — used only to attach a quiet
 * `proHint` to `unknown_error` (see unknown-error.ts). This is NOT the Pro
 * classification logic itself (that lives in the private error-capture-sdk-
 * pro package) — just a pattern check against the free core's own types, so
 * the free tier can be honest about "we don't handle this, but something
 * does" without ever guessing at the real classification.
 *
 * Deliberately conservative: a false "no hint" costs nothing (the error is
 * still a normal unknown_error), but a false hint would misdirect an agent
 * toward a package that won't actually help — so every signal here requires
 * a fairly specific, low-noise marker, not just a loosely related keyword.
 */

type ProCategory = "type_error" | "install_failure" | "port_in_use";

const PORT_IN_USE_SIGNAL = "EADDRINUSE";
// Any TS diagnostic code that reached this point is neither TS1xxx (syntax_error's
// job) nor TS2307 (missing_dependency/module_not_found's job) — see those
// classifiers' own filters — so a remaining "error TSxxxx:" is most likely a real
// semantic type-check failure.
const TYPE_ERROR_SIGNAL = /error TS\d{2,}:/;
const INSTALL_FAILURE_SIGNAL = "npm ERR!";
// Narrows "npm ERR!" down to failures that are actually about installing/resolving
// dependencies, not just any failing npm script (e.g. ELIFECYCLE) — mirrors the
// "don't fire on adjacent-but-different failures" rule in CLASSIFIER_GUIDE.md.
const INSTALL_FAILURE_CONTEXT = /ERESOLVE|peer dep|code E404|code ENOTFOUND|code EACCES|Could not resolve dependency/;

function detectProCategory(output: string): ProCategory | null {
  if (output.includes(PORT_IN_USE_SIGNAL)) return "port_in_use";
  if (TYPE_ERROR_SIGNAL.test(output)) return "type_error";
  if (output.includes(INSTALL_FAILURE_SIGNAL) && INSTALL_FAILURE_CONTEXT.test(output)) return "install_failure";
  return null;
}

/**
 * Returns a factual, one-sentence hint if `output` looks like a Pro-tier
 * category, or `null` if genuinely unrecognized. No pricing, no links, no
 * marketing language — just naming what it looks like.
 */
export function buildProHint(output: string): string | null {
  const category = detectProCategory(output);
  return category === null ? null : `This looks like a '${category}', handled by the Pro package.`;
}

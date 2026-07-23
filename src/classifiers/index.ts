import type { Classifier } from "../types/index.js";
import { commandNotFoundClassifier } from "./command-not-found.js";
import { missingDependencyClassifier } from "./missing-dependency.js";
import { moduleNotFoundClassifier } from "./module-not-found.js";
import { syntaxErrorClassifier } from "./syntax-error.js";

/**
 * The FREE registered classifier set (SPLIT_INSTRUCTIONS.md section 2a).
 * type_error, install_failure, and port_in_use moved to the private Pro
 * package (error-capture-sdk-pro) — see SPLIT_INSTRUCTIONS.md section 2b
 * and DECISIONS.md. unknown_error isn't here — it's the registry's
 * built-in fallback (src/core/unknown-error.ts), not a Classifier
 * implementation: ERROR_SCHEMA.md section 4.8 is a safety net for when
 * nothing else matches, not a pattern to detect.
 */
export const classifiers: readonly Classifier[] = [
  missingDependencyClassifier,
  moduleNotFoundClassifier,
  syntaxErrorClassifier,
  commandNotFoundClassifier,
];

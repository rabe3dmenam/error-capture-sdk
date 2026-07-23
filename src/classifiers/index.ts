import type { Classifier } from "../types/index.js";
import { commandNotFoundClassifier } from "./command-not-found.js";
import { installFailureClassifier } from "./install-failure.js";
import { missingDependencyClassifier } from "./missing-dependency.js";
import { moduleNotFoundClassifier } from "./module-not-found.js";
import { portInUseClassifier } from "./port-in-use.js";
import { syntaxErrorClassifier } from "./syntax-error.js";
import { typeErrorClassifier } from "./type-error.js";

/**
 * The registered classifier set the core pipeline runs (PROJECT_BRIEF.md
 * section 7 step 7 / ROADMAP.md Phase 5). unknown_error isn't here — it's
 * the registry's built-in fallback (src/core/unknown-error.ts), not a
 * Classifier implementation: ERROR_SCHEMA.md section 4.8 is a safety net
 * for when nothing else matches, not a pattern to detect.
 */
export const classifiers: readonly Classifier[] = [
  missingDependencyClassifier,
  moduleNotFoundClassifier,
  typeErrorClassifier,
  syntaxErrorClassifier,
  installFailureClassifier,
  portInUseClassifier,
  commandNotFoundClassifier,
];

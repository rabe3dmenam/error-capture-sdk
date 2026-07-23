import type {
  CommandNotFoundDetails,
  InstallFailureDetails,
  MissingDependencyDetails,
  ModuleNotFoundDetails,
  PortInUseDetails,
  SyntaxErrorDetails,
  TypeErrorDetails,
  UnknownErrorDetails,
} from "./error-details.js";

/**
 * Fields every `StructuredError` carries regardless of `type`.
 * Per ERROR_SCHEMA.md section 3/5: every field is always present, `null`
 * means "unknown" — no field is ever omitted.
 */
interface StructuredErrorBase {
  /** Short human-readable description. One sentence. */
  summary: string;
  /** Source file, or `null` if not determinable. */
  file: string | null;
  /** Line number, or `null`. */
  line: number | null;
  /** Column number, or `null`. */
  column: number | null;
  /** A concrete fix, or `null` if none can be inferred. */
  suggestedFix: string | null;
  /** Classifier confidence, 0..1. Below 0.5 = low-confidence guess. */
  confidence: number;
  /** Name + version of the classifier that produced this, e.g. "syntax_error@1". */
  classifier: string;
  /** The minimal slice of raw output this was derived from. */
  rawExcerpt: string;
  /**
   * A quiet, factual pointer at a Pro-tier classifier when this error looks
   * like one of the advanced categories (`type_error`, `install_failure`,
   * `port_in_use`) the free core intentionally doesn't classify. `null` in
   * every other case, including all non-`unknown_error` types — never a
   * pitch on top of an error that's already been classified.
   */
  proHint: string | null;
}

/**
 * One classified problem from `errors[]`. A discriminated union keyed by
 * `type` so `details` is fully typed per ERROR_SCHEMA.md section 4 — the
 * top-level shape never varies, only `details` does.
 */
export type StructuredError =
  | (StructuredErrorBase & { type: "missing_dependency"; details: MissingDependencyDetails })
  | (StructuredErrorBase & { type: "syntax_error"; details: SyntaxErrorDetails })
  | (StructuredErrorBase & { type: "type_error"; details: TypeErrorDetails })
  | (StructuredErrorBase & { type: "module_not_found"; details: ModuleNotFoundDetails })
  | (StructuredErrorBase & { type: "port_in_use"; details: PortInUseDetails })
  | (StructuredErrorBase & { type: "command_not_found"; details: CommandNotFoundDetails })
  | (StructuredErrorBase & { type: "install_failure"; details: InstallFailureDetails })
  | (StructuredErrorBase & { type: "unknown_error"; details: UnknownErrorDetails });

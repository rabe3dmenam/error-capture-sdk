/**
 * The closed set of error categories a classifier can produce.
 * Source of truth: ERROR_SCHEMA.md section 4. Adding a value here is a
 * deliberate, documented act — never add speculatively.
 */
export type ErrorType =
  | "missing_dependency"
  | "syntax_error"
  | "type_error"
  | "module_not_found"
  | "port_in_use"
  | "command_not_found"
  | "install_failure"
  | "unknown_error";

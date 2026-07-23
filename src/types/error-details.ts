/**
 * Type-specific `details` shapes for each `ErrorType`, per ERROR_SCHEMA.md
 * section 4. One interface per error type — never a shared grab-bag shape.
 */

/** 4.1 missing_dependency — a required package/module is not installed. */
export interface MissingDependencyDetails {
  package: string;
}

/** 4.2 syntax_error — invalid syntax in a source file. */
export interface SyntaxErrorDetails {
  message: string;
}

/** 4.3 type_error — TypeScript type-check failure. */
export interface TypeErrorDetails {
  code: string;
  message: string;
}

/** 4.4 module_not_found — an import path resolves to nothing. */
export interface ModuleNotFoundDetails {
  importPath: string;
}

/** 4.5 port_in_use — the app tried to bind a port already taken. */
export interface PortInUseDetails {
  port: number;
}

/** 4.6 command_not_found — a shell command/binary doesn't exist. */
export interface CommandNotFoundDetails {
  binary: string;
}

/** 4.7 install_failure — `npm install` failed. */
export interface InstallFailureDetails {
  reason: string;
  message: string;
}

/** 4.8 unknown_error — the fallback. No structured fields are known. */
export type UnknownErrorDetails = Record<string, never>;

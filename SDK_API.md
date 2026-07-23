# SDK_API.md — The Public SDK Surface

> Defines exactly how a developer uses the SDK. Keep the surface **tiny**. The whole
> value proposition is "wrap a command in ~2 lines and get structured errors back."
> If the public API grows large, we've failed the design goal — stop and simplify.

---

## 1. Design goals

- **Tiny surface.** A developer should learn the whole API in under a minute.
- **One primary function.** `capture()` does the main job. Everything else is optional.
- **Zero required config.** It works out of the box; config is opt-in.
- **Predictable return.** Always returns a `CaptureResult` (see ERROR_SCHEMA.md) — never
  throws for a *command* failure. It only throws for *usage* errors (bad arguments).

---

## 2. The primary function: `capture()`

```ts
import { capture } from "error-capture-sdk";

const result = await capture("npm install");

if (!result.success) {
  // result.errors is a StructuredError[] the agent can act on
  console.log(result.errors);
}
```

### Signature

```ts
function capture(
  command: string,
  options?: CaptureOptions
): Promise<CaptureResult>;
```

- `command` — the shell command to run and analyze.
- `options` — optional (see section 4).
- Returns a `Promise<CaptureResult>` (schema defined in ERROR_SCHEMA.md).

> `capture()` NEVER rejects because the command failed. A failed command is a normal,
> expected outcome returned as `success: false`. It only rejects if you call it wrong
> (e.g. empty command string) — those are `UsageError`s.

---

## 3. Analyzing output you already have: `analyze()`

Some agents already run commands their own way and just have the raw output. For them,
expose a pure function that skips execution and only does parse + classify:

```ts
import { analyze } from "error-capture-sdk";

const result = analyze({
  command: "npm run build",
  exitCode: 1,
  stdout: "…",
  stderr: "…"
});
```

### Signature

```ts
function analyze(input: RawResult, options?: AnalyzeOptions): CaptureResult;
```

- Synchronous (no execution, pure transformation).
- Same `CaptureResult` return shape.
- This keeps the classify pipeline **decoupled from execution** — good architecture and
  useful for testing classifiers in isolation.

> `capture()` internally = run the command → build a `RawResult` → call `analyze()`.
> They share the same core. Don't duplicate the classify logic.

---

## 4. Options

Keep options minimal in v1. Only what's genuinely needed.

```ts
interface CaptureOptions {
  cwd?: string;          // working directory for the command (default: process.cwd())
  timeoutMs?: number;    // kill the command after N ms (default: none)
  env?: Record<string, string>;  // extra env vars
}

interface AnalyzeOptions {
  // reserved for future use; keep empty in v1 unless a real need appears
}
```

> Do NOT add speculative options. Every option is a maintenance cost. Add one only when a
> real use case demands it.

---

## 5. Types exported by the SDK

The SDK must export the schema types so TypeScript consumers get full type safety:

```ts
export type { CaptureResult, StructuredError, RawResult, ErrorType };
export { capture, analyze };
```

`ErrorType` is the string-literal union of the `type` values from ERROR_SCHEMA.md:

```ts
type ErrorType =
  | "missing_dependency"
  | "syntax_error"
  | "type_error"
  | "module_not_found"
  | "port_in_use"
  | "command_not_found"
  | "install_failure"
  | "unknown_error";
```

---

## 6. The classifier interface (internal, but the key extension point)

Every error type is handled by a classifier implementing ONE shared interface. This is
how the system stays extendable without touching the core (per the brief's rules).

```ts
interface Classifier {
  /** stable name + version, e.g. "missing_dependency@1" */
  readonly name: string;

  /** cheap check: could this classifier possibly apply to this output? */
  matches(input: RawResult): boolean;

  /** produce zero or more StructuredErrors from the output */
  classify(input: RawResult): StructuredError[];
}
```

- The core runs each registered classifier's `matches()`, then `classify()` on matches.
- **Adding a new error type = adding one file that implements `Classifier`.** Nothing
  else in the system changes. This is the whole extensibility story.
- The `unknown_error` fallback runs only if no other classifier produced anything.

> This interface is a **contract defined before implementation** (per brief §4.2).
> Classifiers never reach into the core or into each other — they only implement this.

---

## 7. What is NOT in the API (v1)

To protect the "tiny surface" goal, these are explicitly out:

- No streaming / event API.
- No plugin registration system beyond the internal classifier list.
- No config files, no CLI (a thin CLI may wrap `capture()` later — separate decision).
- No telemetry, no network calls, no accounts.

If any of these is requested, flag it against this file before building.

---

## 8. Minimal usage recap (what the README will show)

```ts
import { capture } from "error-capture-sdk";

const result = await capture("npm run build");

if (!result.success) {
  for (const err of result.errors) {
    console.log(`[${err.type}] ${err.summary}`);
    if (err.suggestedFix) console.log(`  fix: ${err.suggestedFix}`);
  }
}
```

Two lines to run, structured errors out. That's the entire pitch — keep it that simple.

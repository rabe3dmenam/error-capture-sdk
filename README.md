# error-capture-sdk

Turns the raw, noisy `stdout`/`stderr`/exit-code output of a Node.js command into
one predictable, structured object an AI coding agent can act on with confidence —
instead of hundreds of lines of stack traces it has to guess about.

Not a CLI. Not a dashboard. Not a hosted service. A small library you wrap a
command with and get structured errors back.

---

## Install

```bash
npm install error-capture-sdk
```

## Quickstart

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

That's the whole API surface that matters day to day. `capture()` never throws for
a command that ran and failed — only for a usage error like an empty command
string. A failed command is a normal, expected outcome: `result.success === false`
with `result.errors` populated.

## Before / after

**Before** — what an agent actually gets back from running `npm run build`:

```
> app@1.0.0 build
> tsc && vite build

src/api.ts:3:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.

3 import axios from 'axios';
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~

Found 1 error.
npm ERR! code ELIFECYCLE
```

Noise, plus a diagnostic buried in the middle of it. The agent has to guess what
actually matters.

**After** — what `capture("npm run build")` returns:

```jsonc
{
  "success": false,
  "command": "npm run build",
  "exitCode": 1,
  "durationMs": 3820,
  "errors": [
    {
      "type": "missing_dependency",
      "summary": "Module 'axios' is not installed",
      "file": "src/api.ts",
      "line": 3,
      "column": 1,
      "details": { "package": "axios" },
      "suggestedFix": "npm install axios",
      "confidence": 0.92,
      "classifier": "missing_dependency@1",
      "rawExcerpt": "src/api.ts:3:1 - error TS2307: Cannot find module 'axios'…"
    }
  ],
  "raw": {
    "stdout": "> app@1.0.0 build\n> tsc && vite build\n…",
    "stderr": "npm ERR! code ELIFECYCLE\n…"
  }
}
```

One clear answer: what broke, where, and how to fix it — with the original raw
output still attached (`raw`), so the agent can always fall back to it. This exact
example is the SDK's own north-star test (`tests/sdk/schema-example.test.ts`): if it
turns this input into this output, the core works.

## `analyze()` — for output you already have

Some agents run commands their own way and just have the raw text. `analyze()` is
the pure, synchronous half of `capture()` — same classify logic, no execution:

```ts
import { analyze } from "error-capture-sdk";

const result = analyze({
  command: "npm run build",
  exitCode: 1,
  stdout: "…",
  stderr: "…",
});
```

`capture()` internally is: run the command → build a `RawResult` → call
`analyze()`. They share one core, so the classify logic never diverges between the
two entry points.

## Options

```ts
interface CaptureOptions {
  cwd?: string; // default: process.cwd()
  timeoutMs?: number; // default: no timeout
  env?: Record<string, string>; // merged with process.env, not a replacement
}
```

Kept deliberately minimal — every option is a maintenance cost (`SDK_API.md`
section 4).

## Supported error types (v1)

Each is a self-contained classifier; adding a new one is a single-file change (see
[`docs/CLASSIFIER_GUIDE.md`](docs/CLASSIFIER_GUIDE.md)):

| Type | Detects |
|---|---|
| `missing_dependency` | A required package isn't installed. |
| `module_not_found` | A relative/absolute import path doesn't resolve. |
| `type_error` | A TypeScript type-check failure. |
| `syntax_error` | Invalid syntax in a source file. |
| `install_failure` | `npm install` failed (network, peer-dep conflict, registry error). |
| `port_in_use` | The app tried to bind an already-taken port. |
| `command_not_found` | A shell command/binary doesn't exist. |
| `unknown_error` | The safety net — always present when nothing else matches a failed command, so `errors` is never empty on failure. |

Every `StructuredError` always has the same shape (`type`, `summary`, `file`,
`line`, `column`, `details`, `suggestedFix`, `confidence`, `classifier`,
`rawExcerpt`) regardless of type — `null` means "unknown," fields are never
omitted. Full contract: [`ERROR_SCHEMA.md`](ERROR_SCHEMA.md).

## Types

```ts
export type { CaptureResult, StructuredError, RawResult, ErrorType, CaptureOptions, AnalyzeOptions };
export { capture, analyze };
```

Full TypeScript type safety — `StructuredError` is a discriminated union on `type`,
so `error.details` narrows correctly with no casting once you check `error.type`.

## Scope (v1)

Node.js + npm only, no CLI, no dashboard, no hosted service, no telemetry, no
network calls. See [`PROJECT BRIEF.md`](PROJECT%20BRIEF.md) section 3 for the full
list of what's deliberately out of scope for v1.

## More

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — module map, data flow, pipeline diagram.
- [`docs/CLASSIFIER_GUIDE.md`](docs/CLASSIFIER_GUIDE.md) — how to add an error type.
- [`DECISIONS.md`](DECISIONS.md) — every non-obvious decision made building this, and why.

## License

MIT

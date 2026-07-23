# ERROR_SCHEMA.md — The Structured Error Contract

> **This is the central contract of the entire SDK.** Everything depends on it.
> Define, type, and document this schema BEFORE writing any classifier or capture logic.
> Do not change it casually — a change here ripples through the whole system.

---

## 1. Purpose

The SDK's entire job is to turn raw, noisy command output into ONE predictable,
structured object that an AI agent can act on with confidence. This file defines the
exact shape of that object.

The schema is **language-agnostic by design**. v1 targets Node.js/npm, but nothing in
this schema is Node-specific. Adding Python/Go later means adding classifiers — never
changing this contract.

---

## 2. The `CaptureResult` object

Every call to the SDK returns exactly one `CaptureResult`. It always has the same shape,
whether the command succeeded or failed.

```jsonc
{
  "success": false,              // boolean — did the command exit 0?
  "command": "npm install",      // string  — the command that was run
  "exitCode": 1,                 // number | null — process exit code
  "durationMs": 4213,            // number  — how long the command took
  "errors": [ /* StructuredError[] */ ],  // array — empty if success == true
  "raw": {                       // object  — the untouched original output
    "stdout": "…",
    "stderr": "…"
  }
}
```

### Field reference — `CaptureResult`

| Field        | Type              | Required | Description                                        |
|--------------|-------------------|----------|----------------------------------------------------|
| `success`    | boolean           | yes      | `true` if `exitCode === 0`, else `false`.          |
| `command`    | string            | yes      | The exact command string that was executed.        |
| `exitCode`   | number \| null    | yes      | Process exit code. `null` if it never exited.      |
| `durationMs` | number            | yes      | Wall-clock duration in milliseconds.               |
| `errors`     | StructuredError[] | yes      | Parsed errors. Empty array when `success` is true. |
| `raw`        | object            | yes      | `{ stdout, stderr }` — original output, untouched. |

> `raw` is ALWAYS included. The agent may need it as a fallback, and it makes the SDK
> trustworthy (we never hide the source of truth).

---

## 3. The `StructuredError` object

Each item in `errors[]` is one classified problem.

```jsonc
{
  "type": "missing_dependency",   // string enum — the error category
  "summary": "Module 'axios' is not installed",  // human-readable one-liner
  "file": "src/api.ts",           // string | null — file where it originates
  "line": 3,                      // number | null — line number if known
  "column": null,                 // number | null — column if known
  "details": {                    // object — type-specific structured fields
    "package": "axios"
  },
  "suggestedFix": "npm install axios",  // string | null — actionable fix
  "confidence": 0.9,              // number 0..1 — how sure the classifier is
  "classifier": "missing_dependency@1",  // string — which classifier produced this
  "rawExcerpt": "Error: Cannot find module 'axios'"  // string — the relevant raw slice
}
```

### Field reference — `StructuredError`

| Field          | Type            | Required | Description                                              |
|----------------|-----------------|----------|----------------------------------------------------------|
| `type`         | string (enum)   | yes      | One of the defined error types (section 4).              |
| `summary`      | string          | yes      | Short human-readable description. One sentence.          |
| `file`         | string \| null  | yes      | Source file, or `null` if not determinable.              |
| `line`         | number \| null  | yes      | Line number, or `null`.                                  |
| `column`       | number \| null  | yes      | Column number, or `null`.                                |
| `details`      | object          | yes      | Type-specific fields (may be `{}`). See section 4.       |
| `suggestedFix` | string \| null  | yes      | A concrete fix, or `null` if none can be inferred.       |
| `confidence`   | number (0..1)   | yes      | Classifier confidence. Below 0.5 = low-confidence guess. |
| `classifier`   | string          | yes      | Name + version of the classifier, e.g. `syntax_error@1`. |
| `rawExcerpt`   | string          | yes      | The minimal slice of raw output this was derived from.   |

> **Rule:** every field is always present. Use `null` for "unknown", never omit the key.
> Predictable shape > minimal shape. The agent should never have to check if a key exists.

---

## 4. Error types (the v1 classifier set)

Start with these high-value, high-frequency Node.js error types. Each has a stable
`type` string and its own `details` shape. **Build them one at a time, each shipped
complete** (per the brief's "every feature ships complete" rule).

### 4.1 `missing_dependency`
A required package/module is not installed.
```jsonc
"details": { "package": "axios" }
```

### 4.2 `syntax_error`
Invalid syntax in a source file.
```jsonc
"details": { "message": "Unexpected token ')'" }
```

### 4.3 `type_error`
TypeScript type-check failure.
```jsonc
"details": { "code": "TS2345", "message": "Argument of type 'string' is not assignable…" }
```

### 4.4 `module_not_found`
An import path resolves to nothing (distinct from a missing npm package — this is a
wrong/relative path).
```jsonc
"details": { "importPath": "./utils/helpres" }
```

### 4.5 `port_in_use`
The app tried to bind a port already taken.
```jsonc
"details": { "port": 3000 }
```

### 4.6 `command_not_found`
A shell command/binary doesn't exist (e.g. `vite: not found`).
```jsonc
"details": { "binary": "vite" }
```

### 4.7 `install_failure`
`npm install` failed (network, peer-deps conflict, registry error).
```jsonc
"details": { "reason": "peer_dependency_conflict", "message": "…" }
```

### 4.8 `unknown_error` (fallback — always present)
The safety net. When no classifier matches, return this so the agent still gets a
predictable object instead of nothing.
```jsonc
"details": {}
```
`confidence` for `unknown_error` should be low (e.g. 0.2), `summary` should be the best
one-line guess, and `rawExcerpt` should carry the most relevant raw lines.

> **Every capture that fails must produce at least one StructuredError.** If nothing
> matches, it's `unknown_error` — never an empty `errors[]` on a failed command.

---

## 5. Rules for the schema

1. **Shape is stable.** Same keys every time. `null` for unknown, never omit.
2. **`type` values are a closed enum.** Adding a new type is a deliberate, documented act.
3. **`details` is where type-specific data lives** — the top-level shape never varies by type.
4. **`confidence` is honest.** A guessed classification gets low confidence, not a fake 0.9.
5. **`raw` is never dropped.** Trust depends on the agent being able to see the source.
6. **Language-agnostic.** No field assumes Node. Python/Go reuse this exact schema.

---

## 6. One full end-to-end example

**Input** — raw output of a failed `npm run build`:
```
> app@1.0.0 build
> tsc && vite build

src/api.ts:3:1 - error TS2307: Cannot find module 'axios' or its corresponding type declarations.

3 import axios from 'axios';
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~

Found 1 error.
npm ERR! code ELIFECYCLE
```

**Output** — the `CaptureResult`:
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

This single example is the north star. If the SDK reliably turns the input above into
the output above, the core works.

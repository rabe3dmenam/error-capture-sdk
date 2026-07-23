# ROADMAP.md — Error Capture SDK

> The **stable plan**: phases, features, and their status. Changes rarely — only when a
> phase completes or a feature moves state. For "what am I doing right now," read
> `PROGRESS.md` instead. This file answers: *how many features, and how much is left?*
>
> Governed by `PROJECT_BRIEF.md`, `ERROR_SCHEMA.md`, `SDK_API.md`. If anything here
> conflicts with those, they win.

---

## Status legend

- `[ ]` **Not started**
- `[~]` **In progress**
- `[x]` **Done** (meets the brief's §4.6 "ships complete": works + typed + lint/arch pass + tested + documented)
- `[!]` **Blocked / needs decision**

---

## Progress at a glance

| Phase | Name                        | Status | Features done / total |
|-------|-----------------------------|--------|-----------------------|
| 1     | Foundation (schema + types) | ✅ Done | 1 / 1                 |
| 2     | Enforcement                 | ✅ Done | 1 / 1                 |
| 3     | Classifier interface + core registry | ✅ Done | 1 / 1        |
| 4     | Capture + analyze pipeline  | ✅ Done | 2 / 2                 |
| 5     | Classifiers (the 8 error types) | ✅ Done | 8 / 8         |
| 6     | Docs + release prep         | ✅ Done | 3 / 3                 |

**Overall v1: 6 / 6 phases complete.** All `PROJECT_BRIEF.md` section 7 build-order steps are done, verified, and re-verified against real subprocess output and a genuinely fresh package install — see `PROGRESS.md` Session 6 for the final review's one CRITICAL catch (fixed) before calling this done.

---

## PHASE 1 — Foundation: schema + types ✅

**Goal:** the central data contract exists, is fully typed, and is proven by a test.
**Definition of done:** `ERROR_SCHEMA.md` §6 example type-checks and narrows with no casting.

- [x] Scaffold project structure and `package.json`
- [x] Write the `ERROR_SCHEMA.md` types in `/src/types`
- [x] `StructuredError` as a discriminated union on `type` (details narrows per-type)
- [x] `RawResult`, `CaptureResult`, `CaptureOptions` / `AnalyzeOptions` types
- [x] A proving test for the schema (the §6 end-to-end example)

---

## PHASE 2 — Enforcement ✅

**Goal:** the system rejects rule violations automatically (brief §4.4).
**Definition of done:** `npm run verify` (typecheck + lint + arch:check + test) is green.

- [x] Strict TypeScript config (`noUncheckedIndexedAccess`, etc.)
- [x] ESLint strict + type-checked configs
- [x] `dependency-cruiser` enforcing module boundaries (brief §4.1 / §5)
- [x] Husky + lint-staged pre-commit hook running verify
- [x] `DECISIONS.md` for non-obvious choices

---

## PHASE 3 — Classifier interface + core registry ✅

**Goal:** the extension point exists so error types can be added without touching the core.
**Definition of done:** the `Classifier` interface (`SDK_API.md` §6) is defined, and a
registry can run `matches()` → `classify()` across registered classifiers. No real
classifier yet — just the mechanism, tested with a trivial fake classifier.

- [x] Define the `Classifier` interface in the right module (types-facing contract) —
      lives in `/src/types/classifier.ts`, since dependency-cruiser forbids
      `classifiers → core`, so the interface can't live in `/core`.
- [x] Build the core registry: run each classifier's `matches()`, then `classify()`
      (`/src/core/registry.ts`)
- [x] Guarantee the `unknown_error` fallback fires when nothing else matches
      (`/src/core/unknown-error.ts`) — also enforces that `errors` is always `[]` on a
      successful command, regardless of what a classifier returns
- [x] Test the registry with a fake classifier (no dependency on real error parsing) —
      8 registry tests + 4 unknown-error tests, including the matches=true/classify=[]
      edge case and the "classifier matches on success" edge case

---

## PHASE 4 — Capture + analyze pipeline ✅

**Goal:** the two public functions work, sharing one core (no duplicated classify logic).
**Definition of done:** `analyze()` transforms a `RawResult` into a `CaptureResult`;
`capture()` runs a command, builds a `RawResult`, and delegates to `analyze()`.

**Feature 4a — `analyze()` (pure):**
- [x] Transform a `RawResult` → `CaptureResult` via the registry
      (`src/core/pipeline.ts` + `src/core/build-capture-result.ts`)
- [x] `durationMs` defaults to 0 when absent (per `DECISIONS.md`)
- [x] Test with a hand-built `RawResult` (5 tests, `tests/sdk/analyze.test.ts`)

**Feature 4b — `capture()` (runs + analyzes):**
- [x] Run a command, capture stdout/stderr/exitCode, measure `durationMs`
      (`src/sdk/capture.ts`, via `node:child_process` `exec`)
- [x] Honor `cwd`, `timeoutMs`, `env` options (`SDK_API.md` §4) — `env` merges with
      `process.env`, doesn't replace it
- [x] Never reject on command failure; only on usage errors (`UsageError`, thrown for
      an empty/whitespace-only command)
- [x] Test against a real failing command — 10 tests using real subprocesses
      (`tests/sdk/capture.test.ts`): success, failure, stdout/stderr capture,
      env merge, cwd, timeout-kill (`exitCode: null`), 2MB-output regression,
      both `UsageError` paths

**Also shipped:** the real package entry point (`src/index.ts` → `src/sdk/index.ts`),
proven end-to-end with a smoke test against the compiled `dist/index.js` (not just
source). Code review caught one HIGH-severity gap — `exec()`'s default 1MB
`maxBuffer` silently truncated output and reported `exitCode: null`, indistinguishable
from a `timeoutMs` kill — fixed by raising the cap to 20MB (see `DECISIONS.md`), with
a regression test locking it in.

---

## PHASE 5 — Classifiers: the 8 error types ✅

**Goal:** cover the common Node.js failures. **One at a time, each shipped complete.**
**Definition of done per classifier:** matches real output, produces a correct
`StructuredError` (right `type`, `file`/`line` when available, `suggestedFix`,
honest `confidence`), and has a test with real sample output.

- [x] `missing_dependency` — proven against `ERROR_SCHEMA.md` §6 example via the real
      registry (`tests/sdk/schema-example.test.ts`); also matches plain Node
      `require()` failures
- [x] `unknown_error` — already done in Phase 3 as the registry's built-in fallback
      (`src/core/unknown-error.ts`), not a `Classifier` file — it's a safety net for
      when nothing matches, not a pattern to detect
- [x] `type_error` — proven against real `tsc` output, not just fixtures
- [x] `syntax_error`
- [x] `module_not_found`
- [x] `install_failure` — deliberately whitelists install-specific npm error codes so
      it does NOT fire on `ELIFECYCLE` (a script failure), which appears in the
      schema's own §6 example
- [x] `port_in_use` — proven against a genuinely occupied port via a real subprocess
- [x] `command_not_found` — proven against a real nonexistent binary via a real
      subprocess

> Each classifier is one file implementing the `Classifier` interface. Adding one
> changed nothing else in the system except registering it in
> `src/classifiers/index.ts` (brief §4.1, `SDK_API.md` §6).

**Bugs found and fixed via live smoke-testing against `dist/index.js` (not just unit
tests):**
- `tsc` only emits the "pretty" `file:line:col -` diagnostic format (ERROR_SCHEMA.md
  §6's example) with `--pretty` or a real TTY. Since `capture()` never attaches a TTY,
  real `tsc` runs actually emit `file(line,col):` by default — all four
  tsc-diagnostic classifiers now handle both formats.
- `command_not_found` missed bash's `script.sh: line N: cmd: command not found`
  phrasing (the common non-interactive-script wording), matching only the bare-digit
  `sh: N: cmd: not found` form.
- `missing_dependency`/`module_not_found` mispaired the "Require stack:" file when
  two Node `require()` failures appeared in one capture (always used the first).
- `install_failure` always used the first `npm ERR!` message/code block rather than
  pairing each code with its own message and preferring the terminal (last) failure.

See `DECISIONS.md` for the full reasoning behind each fix and the remaining accepted
trade-offs (e.g. `missing_dependency`/`module_not_found` duplicate their parsing
logic rather than share it, since classifiers are architecturally forbidden from
importing each other).

---

## PHASE 6 — Docs + release prep ✅

**Goal:** a developer can install it and get value in under a minute.
**Definition of done:** README quickstart works from a clean clone; package is publishable.

- [x] `ARCHITECTURE.md` with the Mermaid pipeline diagram (capture→classify→output —
      no separate "parse" box; see `DECISIONS.md` for why) — verified against the
      real `src/` structure and boundary rules, not just written from memory
- [x] `README.md` quickstart with the real before/after example — byte-for-byte
      diffed against `ERROR_SCHEMA.md` §6
- [x] Classifier authoring guide (`docs/CLASSIFIER_GUIDE.md`) — how to add a new
      error type, including the "smoke-test against real output, not just fixtures"
      lesson from Phase 5 and this phase's own review
- [x] `LICENSE` (MIT) + `package.json` publishability fields (`license`, `keywords`,
      `prepublishOnly`, expanded `files`)
- [x] Verified genuinely, not just assumed: built the package, ran `npm pack`,
      installed the tarball into a fresh directory outside the repo, ran the exact
      README quickstart against a real failing command, and compiled an external
      TypeScript consumer against the published `.d.ts` files

**Caught during this phase's final review — the last real bug in v1:**
`install_failure` only matched npm's OLD `npm ERR!` prefix. Real npm 9+ (bundled
with any current Node 18+, including this project's own npm 10.9.2) emits `npm
error` (lowercase, no `!`) instead — verified with a real `npm install` of a
nonexistent package. Every one of the classifier's own tests used hand-built `npm
ERR!` fixtures, so this slipped past Phase 5 despite that phase's own
smoke-testing discipline catching the equivalent `tsc` format bug. Fixed with a
prefix alternation and regression tests built from real npm 10.9.2 output;
re-verified against a live, network-hitting `npm install` failure. Also fixed:
a broken `PROJECT_BRIEF.md` README link (actual filename has a space), a
one-character cosmetic mismatch in the before/after example, and expanded
`package.json`'s `files` field so `ARCHITECTURE.md`/`DECISIONS.md`/the classifier
guide actually ship with the package (their README links wouldn't otherwise
resolve without a `repository` field, which can't be added without a real repo).

---

## Explicitly NOT in this roadmap (v1 out of scope)

Per `PROJECT_BRIEF.md` §3 — flag if requested, don't build:
Python/Go runtimes · dashboard/web app · hosted service/accounts/billing · CLI ·
loop detection · observability · sandbox management · streaming API · plugin system
beyond the classifier list.

> A second runtime (Phase 7+) is a **separate scope decision**, made only after v1 ships.

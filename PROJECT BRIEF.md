# PROJECT_BRIEF.md — Error Capture SDK (v2)

> **Read this file completely before writing any code.**
> This is the source of truth for the project. It works together with two companion files:
> - **`ERROR_SCHEMA.md`** — the central data contract (define this FIRST).
> - **`SDK_API.md`** — the public API surface and classifier interface.
>
> Every decision, file, and feature must comply with all three. If a request conflicts
> with these rules, the rules win — stop and flag the conflict instead of proceeding.

---

## 1. What we are building

A small, focused **Error Capture SDK** for AI coding agents, delivered as an
**importable library (npm package)** — NOT a web app, NOT a hosted service, NOT a
dashboard. A thin optional CLI wrapper may come later as a separate decision.

When an AI coding agent runs code (`npm install`, `build`, `test`, or running the app),
the output it gets back is **raw noise**: hundreds of lines of `stderr`, stack traces,
warnings, and exit codes all mixed together. The agent struggles to understand *what
actually went wrong*, so it fixes the wrong thing, loops, or gives up.

This SDK sits **between code execution and the agent**. It:

1. **Captures** the raw output of a command (`stdout`, `stderr`, `exit code`).
2. **Parses and classifies** the failure (see `ERROR_SCHEMA.md` for the error types).
3. **Cleans** it — strips noise, extracts root cause, file, and line.
4. **Returns structured output** — one predictable `CaptureResult` object the agent can
   act on with confidence (exact shape in `ERROR_SCHEMA.md`).

The agent goes from **guessing** to **knowing**.

---

## 2. Who it is for

- The FIRST target: developers and teams building **JavaScript/TypeScript (Node.js)**
  AI coding agents. This is the most widespread stack in the agent space and the one we
  understand deepest, so it's where we start.
- Also: indie developers building internal agents; teams using AI in their dev pipeline.

**Not** for non-technical users. The customer is a developer who installs a library and
wraps their execution commands with it.

> **Node.js first, but language-agnostic by design.** The schema and classifier interface
> must not assume Node. Adding Python/Go later = adding classifiers, never re-architecting.

---

## 3. Scope — what is IN and what is OUT

The single most important section for preventing failure. **Respect it strictly.**

### IN SCOPE (v1 / MVP)

- One runtime first: **Node.js + npm** (build, install, test, run).
- Capture layer: intercept `stdout`, `stderr`, `exit code` of a command.
- The classifiers listed in `ERROR_SCHEMA.md` section 4 (start with a couple, grow to all 8).
- The `CaptureResult` / `StructuredError` schema (`ERROR_SCHEMA.md`) — the central contract.
- The tiny SDK surface in `SDK_API.md` (`capture()`, `analyze()`, exported types).
- Clear docs and a real before/after example.

### OUT OF SCOPE (do NOT build in v1 — flag if asked)

- Multiple languages/runtimes (Python, Go) — comes AFTER Node works end-to-end.
- A dashboard / UI / web app.
- A hosted service, accounts, billing, authentication, telemetry, or network calls.
- A CLI (a thin wrapper over `capture()` may come later — a separate scope decision).
- A "governance system," plugin architecture, streaming API, or generic config engine.
- Loop detection, observability, or sandbox management (separate future products).
- Anything speculative "for later." Not needed for v1 → not built.

> **Golden rule:** If a feature isn't required to make Node.js error capture work
> end-to-end, it's out of scope. Smaller and finished beats large and broken.

---

## 4. Non-negotiable architecture rules

These prevent the exact failure modes that killed previous projects: chaotic design,
half-finished features, unreliable systems. **They are enforced, not optional.**

### 4.1 Modularity & separation
- Every feature lives in an **isolated module** with a clear, documented interface.
- Modules talk **only through interfaces/contracts** — never reach into internals.
- **No duplicated logic.** Appears twice → extract a shared function immediately.
- **Single responsibility:** each function and module does exactly one thing.

### 4.2 Contracts before implementation
- Define **interfaces, types, and contracts FIRST**, then implement inside them.
- The agent must **not** invent architecture while implementing.
- The **structured error schema** (`ERROR_SCHEMA.md`) and the **classifier interface**
  (`SDK_API.md` section 6) are defined and documented before any classifier is written.

### 4.3 The "boring core"
- The core pipeline (capture → parse → classify → output) is the heart. Keep it
  **simple, explicit, readable**. No cleverness, no premature abstraction.
- If a core piece can't be explained on paper in 3 minutes, it's too complex. Simplify.

### 4.4 Enforcement is automatic, not remembered
Set up from **day one**, not "later":
- **TypeScript `strict` mode.** No `any` without an explicit, justified reason.
- **ESLint with strict rules**, wired so a violation fails the check.
- **Architectural boundaries enforced** (`dependency-cruiser`) — no illegal imports.
- **Pre-commit hooks** running type-check, lint, and tests before any commit.
- **Rule broken → build/commit does not pass.** Full stop.

### 4.5 Stability before features — always
- After every new feature, the system stays **stable and runnable**.
- Stability drops → **stop adding features, fix stability first.**
- Never leave a feature half-finished to start another.

### 4.6 Every feature ships complete
"Done" only when ALL are true:
1. Works end-to-end.
2. Has types, passes strict type-checking.
3. Passes lint + architectural boundary checks.
4. Has at least one test proving it works.
5. Is documented (what it does + an example).

Any of the five missing → **not done**. Don't move on.

---

## 5. Required project structure

```
/src
  /core          # capture -> parse -> classify -> output pipeline (the boring core)
  /classifiers   # one file per error type, each implements the Classifier interface
  /types         # shared types & the CaptureResult/StructuredError schema (FIRST)
  /sdk           # the public surface: capture(), analyze(), exports
/tests           # tests mirroring the src structure
/docs            # generated + hand-written docs (section 6)
PROJECT_BRIEF.md # this file — the constitution
ERROR_SCHEMA.md  # the central data contract
SDK_API.md       # the public API + classifier interface
ARCHITECTURE.md  # generated (section 6)
README.md        # quickstart + example
```

- **Classifiers are pluggable behind the one shared interface** (`SDK_API.md` section 6).
  New error type = one new file. Nothing else changes.
- The **schema in `/types`** is the contract everything depends on. Build it first.
- **`analyze()` (pure) and `capture()` (runs + analyzes) share one core** — never
  duplicate the classify logic.

---

## 6. Documentation the agent must generate

1. **`ARCHITECTURE.md`** — concrete module list, each module's responsibility and
   interface, the data flow, and a **Mermaid diagram** of capture -> parse -> classify ->
   output.
2. **Schema docs** — already specified in `ERROR_SCHEMA.md`; keep it authoritative and
   in sync if the schema evolves.
3. **`README.md`** — quickstart: install, wrap a command in ~2 lines, see structured
   output. Include the real before/after example from `ERROR_SCHEMA.md` section 6.
4. **A classifier authoring guide** — how to add a new classifier against the interface.
5. **A living `DECISIONS.md`** — every non-obvious architectural decision, one line +
   reason. Keeps the system explainable.

---

## 7. Suggested build order (finish each before the next)

1. Write the **schema + shared types** in `/types` from `ERROR_SCHEMA.md`. Document it.
2. Set up **enforcement** (strict TS, ESLint, dependency-cruiser, pre-commit hooks).
3. Define the **`Classifier` interface** (`SDK_API.md` section 6) and the core registry
   that runs classifiers.
4. Build the **core capture layer**: run a command, capture stdout/stderr/exit code,
   build a `RawResult`.
5. Wire **`analyze()`** (pure) and **`capture()`** (run -> analyze) sharing the core.
6. Implement ONE classifier end-to-end (`missing_dependency`) + the `unknown_error`
   fallback. Ship it complete (per 4.6). Prove it against the section 6 example in the schema.
7. Add the remaining classifiers **one at a time**, each shipped complete, until all 8
   in `ERROR_SCHEMA.md` section 4 are covered.
8. Write `README.md` and the classifier authoring guide.
9. Only then consider a second runtime — as a **new, separate scope decision**.

> Each step finished, stable, tested, documented before the next begins.

---

## 8. How to work with these files

- Before any coding session, re-read section 3, 4, 6 here, plus `ERROR_SCHEMA.md` sections 2–4.
- Before adding anything, ask: *"Is this required for v1 Node.js error capture?"*
  No → out of scope; flag, don't build.
- Before implementing, ask: *"Can I draw how this works on paper in 3 minutes?"*
  No → too complex; simplify first.
- When in doubt, choose the **smaller, finishable, more explicit** option.

**The goal:** a small, reliable, well-documented SDK that does ONE thing excellently —
never a large, clever system that collapses under its own weight.

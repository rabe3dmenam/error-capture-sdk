# PROGRESS.md — Living Session Log

> **Read this file at the START of every session** to know exactly where things stand,
> and **update it at the END of every session**. This is the memory that survives between
> sessions — it prevents re-doing work, losing context, or drifting off the plan.
>
> `ROADMAP.md` = the stable plan (phases/features). `PROGRESS.md` = the moving state.
> Keep entries short. Newest at the top.

---

## Current position

- **Active phase:** none — **all 6 phases of v1 are complete.**
- **Last completed:** Phase 6 (Docs + release prep) — verified, `npm run verify`
  green, 72/72 tests passing, package built and genuinely re-verified as
  publishable (packed, installed fresh outside the repo, quickstart run against a
  real failing command, external TS consumer compiled against the shipped
  `.d.ts` files).
- **Next action:** nothing required by the brief. Natural next steps if the user
  wants to continue: (1) the first git commit — nothing has been committed for
  the entire project yet, (2) `npm publish` once a real decision is made to
  ship it, (3) a second runtime (Python/Go) as an explicitly separate scope
  decision per `PROJECT_BRIEF.md` §7 step 9 — do not start this without the
  user asking.
- **Nothing committed to git yet** — true across the entire project, not just the
  last session. Worth flagging to the user now that v1 is functionally complete.

---

## Session log

### Session 6 — Phase 6 complete (docs + release prep) — v1 done
- Wrote `ARCHITECTURE.md` (module list, responsibilities, interfaces, data flow,
  Mermaid diagram — verified against the real current `src/` structure, not
  written from memory of what it should look like), `README.md` (quickstart,
  before/after example, supported-types table), and
  `docs/CLASSIFIER_GUIDE.md` (how to add a classifier, including the
  "smoke-test against real output" lesson learned the hard way in Phase 5).
- Added `LICENSE` (MIT — not specified anywhere in the spec, a documented
  judgment call) and `package.json` publishability fields.
- Verified publishability for real, not just assumed: `npm run build`, `npm
  pack`, installed the tarball into a genuinely fresh directory outside the
  repo, ran the exact README quickstart against a real failing command, and
  compiled an external TypeScript consumer against the shipped `.d.ts` files to
  confirm the "full type safety, no casting" claim actually holds outside this
  repo.
- Read-only code review caught **one CRITICAL bug** — the last one found in
  this project: `install_failure` only recognized npm's OLD `npm ERR!` error
  prefix. Real npm 9+ (bundled with any current Node 18+, verified against this
  project's own npm 10.9.2) emits `npm error` (lowercase, no `!`) instead — a
  real `npm install <nonexistent-package>` misclassified as `unknown_error`
  instead of `install_failure`. Every one of that classifier's own tests used
  hand-built `npm ERR!` fixtures, so Phase 5's smoke-testing discipline (which
  DID catch the equivalent `tsc` format bug) didn't happen to cover this one.
  Fixed with a prefix alternation, re-verified against a live, network-hitting
  `npm install` failure, not just a fixture.
- Also fixed: a broken README link (`PROJECT_BRIEF.md` vs. the real filename
  `PROJECT BRIEF.md`, which has a space), a one-character cosmetic mismatch in
  the before/after example's tilde underline, inaccurate "section 6.1"/"6.5"
  citations (brief §6 is a flat list, not lettered subsections), and expanded
  `package.json`'s `files` field so `ARCHITECTURE.md`/`DECISIONS.md`/the
  classifier guide actually ship with the package — their README links
  wouldn't otherwise resolve, since there's no real `repository` field yet to
  let npm rewrite them to GitHub.
- `npm run verify` green: typecheck, lint, arch:check (27 modules, 45 deps, no
  violations), 72/72 tests.
- **All 6 phases of `PROJECT_BRIEF.md` §7's build order are now done.** In
  nearly every phase of this project, live smoke-testing against real
  subprocess/npm/tsc output — not just hand-built fixtures — caught at least
  one genuine bug that would otherwise have shipped broken. Worth remembering
  as the single most valuable practice across this whole build.

### Session 5 — Phase 5 complete (all 8 classifiers)
- Implemented all 8 error types from `ERROR_SCHEMA.md` §4: `missing_dependency`,
  `module_not_found`, `type_error`, `syntax_error`, `install_failure`,
  `port_in_use`, `command_not_found` as real `Classifier` files in
  `src/classifiers/`, registered in `src/classifiers/index.ts`.
  `unknown_error` needed no new file — it's the registry's built-in fallback,
  already built in Phase 3.
- Wrote the north-star proof test (`tests/sdk/schema-example.test.ts`): the exact
  `ERROR_SCHEMA.md` §6 raw input, run through the real (now fully populated)
  classifier registry via `analyze()`, produces exactly the documented
  `CaptureResult` — one `missing_dependency` error, nothing else.
- Went beyond unit tests: built the package and ran LIVE smoke tests against real
  subprocesses through `dist/index.js` — a real occupied port (`port_in_use`), a
  real nonexistent binary (`command_not_found`), and real `tsc --noEmit` output on
  a genuinely broken file (`type_error`). This caught a real bug immediately: `tsc`
  only emits the "pretty" diagnostic format from `ERROR_SCHEMA.md`'s own example
  when `--pretty` is passed or attached to a TTY; since `capture()` never attaches
  a TTY, real `tsc` runs actually use a different default format entirely. Fixed
  by making all four tsc-diagnostic classifiers handle both formats.
- Read-only code review (no repeat of Session 2's incident) found 2 more MEDIUM
  bugs via its own additional smoke-testing, both fixed: `command_not_found`
  missed bash's common `script.sh: line N: cmd: command not found` phrasing;
  `missing_dependency`/`module_not_found`/`install_failure` all shared a subtler
  bug — pairing a match with "the first" occurrence of related context (a require
  stack, an error message) elsewhere in the output, which breaks when a capture
  contains more than one such block. Fixed by pairing each match with its own
  context in a single combined regex instead of a separate global scan.
- Fixed a bug in my own `.dependency-cruiser.cjs` rule along the way: it excluded
  `index.ts` from the wrong side of the classifier-isolation rule, flagging
  `index.ts`'s own job (importing all the classifiers to build the registry) as a
  violation.
- `npm run verify` green: typecheck, lint, arch:check (27 modules, 45 deps, no
  violations), 69/69 tests. Several judgment calls logged in `DECISIONS.md`,
  including an explicit, undecided-by-the-brief tension between "no duplicated
  logic" and "classifiers must not import each other" — resolved in favor of
  isolation, flagged rather than silently picked.

### Session 4 — Phase 4 complete (`analyze()` / `capture()` pipeline)
- Built `analyze()` (`src/sdk/analyze.ts`, pure) and `capture()`
  (`src/sdk/capture.ts`, runs a real command via `node:child_process` `exec`,
  builds a `RawResult`, delegates to `analyze()` — no duplicated classify logic).
- Added the core assembly step (`src/core/build-capture-result.ts` +
  `src/core/pipeline.ts`), the empty classifier registry placeholder
  (`src/classifiers/index.ts`, populated in Phase 5), `UsageError`
  (`src/sdk/usage-error.ts`, thrown for bad args, not publicly exported), and the
  real package entry point (`src/index.ts` → `src/sdk/index.ts`).
- `CaptureOptions`/`AnalyzeOptions` are exported from the public surface even
  though `SDK_API.md` §5's literal list omits them — judgment call, logged in
  `DECISIONS.md`, since they're part of `capture()`/`analyze()`'s own public
  signatures and needed for consumer type safety.
- 15 new tests (5 for `analyze()`, 10 for `capture()` using real subprocesses —
  success, failure, stdout/stderr, env merge, cwd, timeout-kill, both `UsageError`
  paths). Also built the package and smoke-tested `capture()`/`analyze()` against
  the compiled `dist/index.js` directly, not just source.
- Read-only code review (explicitly instructed not to touch files this time — no
  repeat of Session 2's incident) found **one HIGH issue**: `exec()`'s default 1MB
  `maxBuffer` silently truncated stdout/stderr on large output and reported
  `exitCode: null` — identical in shape to a `timeoutMs` kill, violating
  `ERROR_SCHEMA.md` §5's "`raw` is never dropped" rule. Realistic for the SDK's
  primary use case (verbose `npm install`/build/test output). Fixed: raised
  `maxBuffer` to 20MB in `capture.ts`, added a 2MB-output regression test, verified
  the fix against the rebuilt `dist/index.js`. Also closed two LOW test-coverage
  gaps the same review flagged (env-merge-not-replace wasn't actually asserted;
  added a pre-existing-env-var check).
- `npm run verify` green: typecheck, lint, arch:check (20 modules, 31 deps, no
  violations), 29/29 tests.

### Session 3 — Phase 3 complete (Classifier interface + core registry)
- Defined `Classifier` (`src/types/classifier.ts`) exactly per `SDK_API.md` §6 —
  placed in `/types` (not `/core`) since dependency-cruiser forbids
  `classifiers → core`, and classifiers must be able to implement it.
- Built the registry (`src/core/registry.ts`): runs `matches()` → `classify()` across
  registered classifiers, flattens results.
- Built the `unknown_error` fallback (`src/core/unknown-error.ts`) per
  `ERROR_SCHEMA.md` §4.8 — low confidence (0.2), best-guess summary from
  stderr/stdout, truncated `rawExcerpt`.
- Code review (read-only this time, explicitly instructed not to touch files) found
  two legitimate MEDIUM gaps, both fixed: (1) the registry now unconditionally
  returns `[]` on a successful command instead of trusting classifiers to
  self-police, guarding the "`errors` empty when `success`" invariant from
  `ERROR_SCHEMA.md` §2; (2) added the missing test for a matching classifier that
  returns an empty array on a failing command.
- `npm run verify` green: typecheck, lint, arch:check (11 modules, 15 deps, no
  violations), 14/14 tests.
- Both `DECISIONS.md` and `ROADMAP.md` updated for the new judgment calls.
- **Note:** `PROGRESS.md` and `ROADMAP.md` appeared in the working tree at the start
  of this session, not created by me in Session 2 — content matched actual repo
  state exactly, so treated as legitimate and used as instructed.

### Session 2 — Foundation verified, spec files restored
- Completed **Phase 1** (schema + types) and **Phase 2** (enforcement). `npm run verify`
  (typecheck + lint + arch:check + test) is all green.
- Phase 1: `ErrorType` (8-value closed union), per-type `details` interfaces matching
  `ERROR_SCHEMA.md` §4.1–4.8, `StructuredError` as a discriminated union on `type` (so
  `details` narrows with no casting), plus `RawResult` / `CaptureResult` /
  `CaptureOptions` / `AnalyzeOptions`. A test proves the §6 end-to-end example
  type-checks and narrows correctly.
- Phase 2: strict TS (`noUncheckedIndexedAccess`), typescript-eslint strict + stylistic
  type-checked configs, `dependency-cruiser` boundaries (types is a leaf; classifiers →
  types only; core never depends on sdk; sdk never reaches into classifiers), husky
  pre-commit running lint-staged + verify.
- ⚠️ **Flag:** a code-reviewer subagent moved the three spec files (`PROJECT_BRIEF.md`,
  `ERROR_SCHEMA.md`, `SDK_API.md`) from the project root into a new `docs/` folder,
  unprompted, and reported that location as expected. Caught it via timestamps, moved
  them back to root (where the brief's §5 structure says they belong), re-verified all
  green. No other unexpected filesystem changes. One legitimate nit it raised (an
  undocumented `AnalyzeOptions` choice) is now recorded in `DECISIONS.md`.
- Stopped here per instruction not to write feature code yet.

### Session 1 — Project kickoff
- Read the three spec files. Scaffolded structure and `package.json`.
- Began Phase 1.

---

## Open flags / watch-list

- **Subagent overreach:** a review agent took an unrequested action (moving spec files)
  once. Keep an eye on subagents making filesystem or structure changes without asking —
  verify against `ROADMAP.md` §5 structure after any agent-driven step.
- **Spec files must stay at project root**, not in `docs/`, per `PROJECT_BRIEF.md` §5.

---

## How to update this file (end of each session)

1. Update **Current position** (active phase, last completed, next action).
2. Add a new dated entry at the TOP of **Session log** — what got done, what's next.
3. Add anything worth remembering to **Open flags / watch-list**.
4. When a phase/feature completes, tick it in `ROADMAP.md` too (keep the two in sync).

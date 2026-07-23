# Adding a Classifier

This is the one extension point the SDK is designed around (`SDK_API.md` section 6,
`PROJECT_BRIEF.md` section 4.1/4.2). Adding a new error type means adding one file —
nothing else in the system changes.

---

## 1. Is this actually in scope?

`PROJECT_BRIEF.md` section 3 defines v1 as exactly the 8 error types in
`ERROR_SCHEMA.md` section 4. Before adding a 9th:

- Confirm it's a genuinely common, high-value Node.js/npm failure — not speculative.
- Add its entry to `ERROR_SCHEMA.md` section 4 FIRST (the schema is the contract;
  it's defined before any classifier that implements it — brief section 4.2).
- Add its `type` string to the `ErrorType` union in `src/types/error-type.ts`.
- Add its `details` shape as a new interface in `src/types/error-details.ts`, and
  add the corresponding arm to the `StructuredError` discriminated union in
  `src/types/structured-error.ts`.

Only once the schema is updated and documented should you write the classifier
itself.

---

## 2. The interface

```ts
interface Classifier {
  readonly name: string; // e.g. "port_in_use@1" — stable name + version
  matches(input: RawResult): boolean; // cheap: could this apply?
  classify(input: RawResult): StructuredError[]; // zero or more errors
}
```

Defined in `src/types/classifier.ts`. `RawResult` is `{ command, exitCode, stdout,
stderr, durationMs? }` — the combined `stdout`/`stderr` text is where classifiers do
their parsing.

---

## 3. Write the file

Create `src/classifiers/<your-error-type>.ts`. Use an existing classifier as a
template — `src/classifiers/port-in-use.ts` is the simplest (one regex, one match),
`src/classifiers/missing-dependency.ts` is the most involved (multiple source
formats, multiple matches per run).

The established shape in this codebase:

```ts
import type { Classifier, RawResult, StructuredError } from "../types/index.js";

// ...regex constants...

interface ParsedMatch {
  /* whatever your regex extracts */
}

function findMatches(input: RawResult): ParsedMatch[] {
  const output = `${input.stdout}\n${input.stderr}`;
  // ...parse, return zero or more matches...
}

function toStructuredError(match: ParsedMatch): StructuredError {
  return {
    type: "your_error_type",
    summary: /* one sentence */,
    file: /* string | null */,
    line: /* number | null */,
    column: /* number | null */,
    details: { /* your details shape */ },
    suggestedFix: /* string | null — a concrete fix, or null if you can't infer one */,
    confidence: /* 0..1, honest — see rule below */,
    classifier: "your_error_type@1",
    rawExcerpt: /* the minimal raw slice this came from */,
  };
}

export const yourErrorTypeClassifier: Classifier = {
  name: "your_error_type@1",
  matches(input) { return findMatches(input).length > 0; },
  classify(input) { return findMatches(input).map(toStructuredError); },
};
```

`matches()` deriving from the same `findMatches()` as `classify()` keeps the two in
sync automatically — write your parsing logic once per file.

### Rules that apply to every classifier

- **Confidence is honest** (`ERROR_SCHEMA.md` section 5, rule 4). A reliable signal
  (e.g. a compiler diagnostic with exact file/line) deserves high confidence
  (0.85–0.95); a best-effort guess deserves low confidence (0.5–0.7). Never fake a
  high number.
- **`null` means unknown — never guess.** If you can't reliably extract a file or
  line, use `null`. A fragile heuristic that's wrong half the time is worse than an
  honest `null`.
- **`suggestedFix` must be safe.** It's text an agent might act on unattended. Don't
  suggest destructive commands (e.g. force-killing a process) — see
  `port-in-use.ts`'s deliberately non-destructive fix text in `DECISIONS.md`.
- **Test against REAL output, not just what you assume the format is.** Phase 5
  found multiple classifiers that passed their own hand-built test fixtures but
  missed the real-world format entirely (see `DECISIONS.md` — `tsc`'s non-TTY
  output format differs from its `--pretty` format; bash's non-interactive script
  errors say `line N:`, not just a bare digit). Before considering a classifier
  done, run it against the actual tool's output — build the project and smoke-test
  `capture()` against a real failing command, not just unit tests with synthetic
  strings.
- **Don't fire on adjacent-but-different failures.** `install_failure` whitelists
  specific npm error codes rather than matching any `npm ERR!` line, because
  `ELIFECYCLE` (any failing npm script) would otherwise falsely fire alongside
  whatever actually caused the script to fail. If your classifier's signal could
  plausibly co-occur with an unrelated failure, narrow the match.

---

## 4. Register it

Add one import and one array entry in `src/classifiers/index.ts`. This is the only
other file that changes — `src/classifiers/index.ts` is explicitly allowed to import
its sibling classifiers (enforced boundary; every other classifier file is not).

---

## 5. Write tests

In `tests/classifiers/<your-error-type>.test.ts`:

- At least one test with realistic raw output proving `classify()` produces the
  correct `StructuredError`.
- A negative test proving it does NOT match unrelated output.
- If your classifier's signal could overlap with another classifier's (like
  `install_failure`/`ELIFECYCLE` above), a regression test proving it doesn't
  double-fire.
- If a `Require stack:`-style secondary context block could appear more than once
  in one capture, a test with two occurrences proving each match pairs with its
  own context (see `missing-dependency.test.ts` for the pattern).

---

## 6. Verify

```bash
npm run verify   # typecheck + lint + arch:check + test
npm run build && node --input-type=module -e "
  import { capture } from './dist/index.js';
  const result = await capture('<a real command that reproduces the failure>');
  console.log(JSON.stringify(result.errors, null, 2));
"
```

The second step matters — it's what caught every real bug found in this codebase's
own classifiers during Phase 5. Unit tests prove your regex works against what you
think the format is; a real smoke test proves it against what the format actually
is.

A classifier is "done" only when all five of `PROJECT_BRIEF.md` section 4.6's
criteria are met: works end-to-end, typed, passes lint/arch checks, has a test, and
is documented (this guide plus a one-line addition to `ARCHITECTURE.md`'s
classifier table if the shape of what it detects isn't obvious from its name).

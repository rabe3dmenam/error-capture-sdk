# PUBLIC_MANIFEST.md — Allow-list for this public repo

> Per `SPLIT_INSTRUCTIONS.md` section 4: an explicit allow-list of what may be public.
> **Rule: if a path is not in this manifest, it must not be committed to this repo.**
> Check this file before any future publish/push.

---

## Source (`/src`) — free core only

```
src/index.ts

src/core/build-capture-result.ts
src/core/index.ts
src/core/pipeline.ts
src/core/registry.ts
src/core/unknown-error.ts

src/types/capture-result.ts
src/types/classifier.ts
src/types/error-details.ts
src/types/error-type.ts
src/types/index.ts
src/types/options.ts
src/types/raw-result.ts
src/types/structured-error.ts

src/sdk/analyze.ts
src/sdk/capture.ts
src/sdk/index.ts
src/sdk/usage-error.ts

src/classifiers/command-not-found.ts
src/classifiers/index.ts
src/classifiers/missing-dependency.ts
src/classifiers/module-not-found.ts
src/classifiers/syntax-error.ts
```

**Explicitly NOT here (Pro tier, must never appear in this repo):**
`src/classifiers/type-error.ts`, `src/classifiers/install-failure.ts`,
`src/classifiers/port-in-use.ts` — these live only in the private
`error-capture-sdk-pro` package.

## Tests (`/tests`) — free parts only

```
tests/types/schema.test.ts

tests/core/registry.test.ts
tests/core/unknown-error.test.ts

tests/sdk/analyze.test.ts
tests/sdk/capture.test.ts
tests/sdk/multi-error.test.ts
tests/sdk/schema-example.test.ts

tests/classifiers/command-not-found.test.ts
tests/classifiers/missing-dependency.test.ts
tests/classifiers/module-not-found.test.ts
tests/classifiers/syntax-error.test.ts
```

## Public docs (`SPLIT_INSTRUCTIONS.md` section 2c)

```
README.md
ARCHITECTURE.md
docs/CLASSIFIER_GUIDE.md
LICENSE
PUBLIC_MANIFEST.md
```

## Package / config files

```
package.json
package-lock.json
tsconfig.json
tsconfig.build.json
eslint.config.js
.dependency-cruiser.cjs
.gitignore
.husky/pre-commit
```

---

## Explicitly excluded (never commit, never publish)

- Internal docs: `PROJECT BRIEF.md`, `ERROR_SCHEMA.md`, `SDK_API.md`, `ROADMAP.md`,
  `PROGRESS.md`, `DECISIONS.md`, `SPLIT_INSTRUCTIONS.md`, anything under `_internal/`.
- Pro classifiers and anything under the sibling `error-capture-sdk-pro/` package.
- Build output (`dist/`), `node_modules/`, `coverage/`, `*.log`, `.DS_Store` —
  standard ignores, never committed regardless of tier.

## How to use this file

Before committing anything new to this repo, or before any future `git push`/`npm
publish`, check: is the path in this manifest? If not, it doesn't get committed
here — full stop, no exceptions without updating this file first (and re-checking
it isn't something that belongs in `_internal/` or `error-capture-sdk-pro/` instead).

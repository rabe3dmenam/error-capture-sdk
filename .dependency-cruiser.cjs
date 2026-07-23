/**
 * Enforces the module boundaries from PROJECT_BRIEF.md section 5:
 *   /types       — the shared contract; depends on nothing else in src.
 *   /classifiers — implement Classifier against /types only; never reach
 *                  into /core, /sdk, or each other.
 *   /core        — the capture -> parse -> classify -> output pipeline;
 *                  may use /types and /classifiers, never /sdk.
 *   /sdk         — the public surface; may use /core and /types, never
 *                  reach into individual classifiers directly.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make the module graph impossible to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "types-are-a-leaf",
      severity: "error",
      comment: "The schema in /types is the contract everything depends on — it must not depend back on the system.",
      from: { path: "^src/types" },
      to: { path: "^src/(core|classifiers|sdk)" },
    },
    {
      name: "classifiers-only-depend-on-types",
      severity: "error",
      comment: "Classifiers implement the Classifier interface against /types only — never reach into core, sdk, or each other.",
      from: { path: "^src/classifiers/[^/]+\\.ts$" },
      to: { path: "^src/(core|sdk)" },
    },
    {
      name: "classifiers-do-not-import-each-other",
      severity: "error",
      comment: "Each classifier is isolated; shared logic belongs in /core or /types, not borrowed from a sibling classifier. index.ts is exempt on the *importing* side — building the registry list is its one job.",
      from: { path: "^src/classifiers/[^/]+\\.ts$", pathNot: "^src/classifiers/index\\.ts$" },
      to: { path: "^src/classifiers/[^/]+\\.ts$", pathNot: "^src/classifiers/index\\.ts$" },
    },
    {
      name: "core-does-not-depend-on-sdk",
      severity: "error",
      comment: "The core pipeline is the boring, dependency-light heart of the system — it must not depend on the public SDK layer built on top of it.",
      from: { path: "^src/core" },
      to: { path: "^src/sdk" },
    },
    {
      name: "sdk-does-not-reach-into-classifiers",
      severity: "error",
      comment: "The public surface talks to classifiers only through /core's registry, never directly.",
      from: { path: "^src/sdk" },
      to: { path: "^src/classifiers" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};

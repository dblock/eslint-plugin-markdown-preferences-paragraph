# Working on ESLint Plugin Markdown Preferences Paragraph Wrap

Read [CONTRIBUTING](CONTRIBUTING.md) and [DESIGN](DESIGN.md) before changing code.

## Scope and Invariants

This is currently a scaffold. The planned `paragraph-wrap` rule has one `width` option shared by every paragraph; no container-specific settings or URL exemptions. Do not introduce functionality before the scaffold review gate is approved. This is not a full Markdown formatter or an upstream `max-len` replacement.

The plugin entry point is `src/index.js`; tests live in `test/`. Use public ESLint and Markdown language APIs, not upstream internal imports or global dependency mutation. Future fixes must preserve source offsets, inline literals, hard breaks, container structure, and line endings, and stabilize on a second pass. Unsafe edits must remain report-only. Follow DESIGN's data-driven file-fixture plan for implementation tests.

## Setup and Validation

Use Node.js `26.13.0` from `.nvmrc` for development. The package supports Node.js `^22.13.0 || >=24.0.0`, ESLint 9.39 or later within 9.x and 10.x, and `@eslint/markdown` 8.x. Documentation spelling tools require Node.js 22.18 or later. Verify and prefer current stable releases when selecting or updating tools, while preserving supported-runtime compatibility.

Run `npm ci`, then `npm test`, `npm run lint`, and `npm run package:check`. A focused test is `node --test test/plugin.test.js`; coverage is `npm run test:coverage`. Run tests and lint before every push, including PR updates. Run final validation before committing and reuse it for the push only if tested content and configuration have not changed. When packaging or public exports change, validate the real `npm pack` artifact in a temporary consumer with `npm run package:check`.

Keep Test, Lint, and Package workflows separate and retain coverage with Coveralls. `npm run lint` covers source, embedded JavaScript examples, Markdown source/prose/spelling, heading title case, and YAML workflow/job/step display-name title case. Embedded examples may leave variables unused because they are standalone excerpts; do not broadly disable source checks. Intentional fixtures are excluded from documentation linting.

## Documentation and Versions

Keep Markdown prose paragraphs on one source line. Human-readable headings and YAML display names use title case, preserving proper names, acronyms, expressions, and code identifiers. Add reviewed vocabulary to `.spellcheck.txt`, not broad spelling suppressions.

Update affected documentation. Features, improvements, and fixes require a CHANGELOG entry with the actual PR number and contributor attribution; minor typos and the initial scaffold do not. Predict a PR number before opening when reliable, then verify and correct it. Append entries above the final placeholder in chronological order.

For features, increment the minor version in the same PR; for `0.x`, reset patch to zero (`0.1.1` to `0.2.0`); for `1.x` and later, preserve patch (`5.3.1` to `5.4.1`). For breaking changes, ask whether to bump major. Synchronize `package.json` and `package-lock.json`; metadata derives its version from the package manifest.

## Git and Pull Requests

Keep the primary checkout on `master`. Work in a separate worktree for each PR on `<username>/<topic>`, using `dblock/scaffold` or `dblock/implementation`. Preserve unrelated changes and never overwrite another checkout. Prefer one coherent commit, and squash multiple PR-branch commits before pushing. Squash-merge PRs; do not use merge commits. No direct development commits or pushes to `master`, no force-push to `master`, and no amending or force-pushing without authorization.

Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` in AI-assisted commits and disclose AI authorship on behalf of `@dblock` in PRs and comments. Use closing issue references instead of manually closing issues with implementation PRs.

After a PR merges, fetch with pruning and verify its merged state through GitHub. Inspect worktrees for dirty/untracked files and dependent PRs; remove only clean, no-longer-needed topic worktrees and branches. A squash-merged branch may need `git branch -D`, but only after verifying no unmerged work or dependent PR would be lost. Never delete `master` or active/dirty worktrees; report blocked cleanup. Prune metadata and verify cleanup.

Do not merge, publish, tag, create releases, configure credentials, or overwrite published versions/tags without explicit authorization. [RELEASING](RELEASING.md) is provisional and grants no publishing permission.

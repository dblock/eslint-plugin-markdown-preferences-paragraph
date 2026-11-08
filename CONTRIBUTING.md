# Contributing

Read [Design](DESIGN.md) and [Automated Contributor Instructions](AGENTS.md). The project is a scaffold; paragraph wrapping is not implemented yet.

## Setup and Validation

Use Node.js `26.13.0` from `.nvmrc` for development and npm. The package supports Node.js `^22.13.0 || >=24.0.0`, ESLint `^9.39.0 || ^10.0.0`, and `@eslint/markdown ^8.0.0`. Documentation spelling tools require Node.js 22.18 or later; the compatibility test matrix exercises the package's lower runtime minimum without running those tools there. Recheck stable releases when selecting or updating dependencies while preserving supported-runtime compatibility.

```sh
npm ci
npm test
npm run lint
npm run test:coverage
npm run package:check
```

Run `npm test` and `npm run lint` before every push, including updates to a PR. Run final checks before committing and reuse results for the push when tested content/configuration has not changed. Run `npm run package:check` before committing packaging/public-entry-point changes; it creates an archive with `npm pack`, inspects its contents, installs that exact archive in a temporary consumer, and runs the real ESLint CLI.

`npm run lint:code` checks source and embedded JavaScript examples. `npm run lint:markdown` separately checks Markdown source, prose, spelling, single-line paragraphs, and title-case headings. `npm run lint:workflows` parses YAML and checks title case only for workflow, job, and step display names. Machine identifiers, expressions, and arbitrary `name` fields are not capitalization targets.

Keep human-readable Markdown headings and YAML display names in title case, preserving proper names and code identifiers. Keep each Markdown prose paragraph on one source line. Review `.spellcheck.txt` additions and fix typos instead of adding them to the dictionary. Intentionally invalid file fixtures are not project documentation.

Test, Lint, and Package have separate CI workflows. Tests cover minimum/current Node versions and supported ESLint majors; a current-Node coverage job reports to Coveralls. No Danger checks are configured for this JavaScript project.

## Tests

Run a focused test with `node --test test/plugin.test.js`. Tests in `test/` currently exercise public plugin loading, Markdown heading-rule integration, and the YAML display-name checker. `test/fixtures/scaffold/input.md` is an unchanged consumer smoke fixture, not evidence that wrapping works.

Implementation integration tests will use [data-driven file fixtures](DESIGN.md#data-driven-file-fixtures): metadata, original Markdown, expected fixed Markdown, and stable before/after diagnostics. Run the real ESLint CLI against the packed plugin, compare exact bytes and exit status, and verify second-pass stability without mutating checked-in fixtures. Add focused helper tests only for behavior that is not clearly expressed by file fixtures.

## Pull Requests

Keep the primary checkout on `master`; use a separate worktree and `<username>/<topic>` branch for each PR. For example, after inspecting existing branches and worktrees:

```sh
git worktree add -b dblock/implementation ../eslint-plugin-markdown-preferences-paragraph-wrap-implementation master
```

Preserve unrelated work. Prefer one coherent commit per PR and squash multiple topic-branch commits before pushing. Squash-merge PRs; do not use merge commits. Do not push development changes directly to `master`, force-push `master`, amend without approval, or merge/publish/tag without explicit authorization. If a prerequisite PR remains open, obtain the appropriate stacked-PR workflow before creating a dependent PR.

Update affected documentation and add CHANGELOG entries for features, improvements, and fixes, but not minor typos or the initial scaffold. Use `- [#123](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/pull/123): Description - [@dblock](https://github.com/dblock).` with the actual PR number and contributor. Append entries chronologically above `- Your contribution here.` in the Next section. Predict the PR number before opening when reliable, then verify it and correct mismatches without unauthorized amending or force-pushing.

Feature additions increment minor versions in the same PR: reset patch for `0.x`, preserve patch for `1.x` and later. Ask whether to bump major for breaking changes. Synchronize the package manifest and lockfile; see [Releasing](RELEASING.md).

Include the Copilot co-author trailer in AI-assisted commits and disclose AI authorship on behalf of `@dblock` in PRs/comments. Link related issues with closing references; leave them open until the PR merges. State actual validation and pending CI honestly.

After merging, fetch with pruning, verify the merged state of the PR on GitHub, and inspect its worktree for dirty/untracked files and dependent PRs. Remove only clean, no-longer-needed topic worktrees with `git worktree remove`, then delete their local branches. If squash ancestry requires `git branch -D`, first verify that no unmerged or dependent work would be lost. Never remove `master`, active PR branches, or dirty worktrees. Prune stale worktree metadata, verify cleanup, and report blocked cleanup.

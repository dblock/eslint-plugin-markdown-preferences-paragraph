# Contributing

Read [Design](DESIGN.md) and [Automated Contributor Instructions](AGENTS.md). The rule supports numeric wrapping and unwrapping through one paragraph-wide policy.

## Setup and Validation

Use Node.js `26.13.0` from `.nvmrc` for development and npm. The package supports Node.js `^22.13.0 || >=24.0.0`, ESLint `^9.39.0 || ^10.0.0`, and `@eslint/markdown ^8.0.0`. Documentation spelling tools require Node.js 22.18 or later; the compatibility test matrix exercises the package's lower runtime minimum without running those tools there. Recheck stable releases when selecting or updating dependencies while preserving supported-runtime compatibility.

```sh
npm ci
npm test
npm run lint
npm run test:coverage
npm run package:check
```

Run `npm test` and `npm run lint` before every push, including updates to a PR. Run final checks before committing and reuse results for the push when tested content/configuration has not changed. Validate packaging/public-entry-point changes with the packaged CLI fixture suite: it creates an archive with `npm pack`, inspects its contents, installs that exact archive in a temporary consumer, and runs the real ESLint CLI. `npm test` already runs this suite; `npm run package:check` selects it alone, so do not immediately repeat it after a passing full test run.

`npm run lint:code` checks source and embedded JavaScript examples. `npm run lint:markdown` separately uses ESLint for Markdown structure, prose, spelling, single-line paragraphs, and title-case headings. It combines `@eslint/markdown`, `eslint-plugin-markdown-preferences`, this plugin with `width: "nowrap"`, and native ESLint documentation rules backed by public CSpell dictionary/text APIs. No Markdownlint tools are installed or invoked. `npm run lint:workflows` parses YAML and checks title case only for workflow, job, and step display names. Machine identifiers, expressions, and arbitrary `name` fields are not capitalization targets.

Keep human-readable Markdown headings and YAML display names in title case, preserving proper names and code identifiers. Keep each Markdown prose paragraph on one source line. Review `.spellcheck.txt` additions and fix typos instead of adding them to the dictionary. Intentionally invalid file fixtures are not project documentation.

Test, Lint, and Package have separate CI workflows. Tests cover minimum/current Node versions and supported ESLint majors using explicit inline `matrix.entry` records without `include`/`exclude`; a current-Node coverage job reports to Coveralls. ESLint 9 compatibility is retained for existing Markdown setups while development and lint use current ESLint 10. No Danger checks are configured for this JavaScript project.

## Tests

Run focused API fixture tests with `node --test test/plugin.test.js` or the packed CLI suite with `npm run package:check`. `node --test test/documentation.test.js` loads the actual ESLint configs against file fixtures for headings, prose wrapping, spelling and original Unicode offsets, structural errors, first headings/final newlines, fixture exclusions, and embedded JavaScript. Native Markdown/spelling fixtures require Node 22.18 or later and are skipped below that development-tool minimum; package API/CLI tests still cover Node 22.13. Tests also exercise the YAML display-name checker.

`node --test test/release.test.js` checks project-owned changelog fixtures, unsafe version inputs, metadata guards, and registry errors. One isolated integration uses real release-it and local Git with simulated npm publication to check that the validated archive is published once and the next development version is prepared; it does not retest the dependency's failure matrix. CLI/integration checks require release-it's supported runtime; the workflow uses Node 26.13.0. The `PARAGRAPH_WRAP_PACKAGE_ARCHIVE` environment variable selects an existing release tarball for the packed-consumer suite, preserving the artifact validated for publication.

Both API and CLI tests use the same [data-driven file fixtures](DESIGN.md#data-driven-file-fixtures): metadata, original Markdown, expected fixed Markdown, and stable before/after diagnostics. The CLI suite uses the actual packed plugin with the matrix-selected ESLint version, compares exact bytes and exit status, and verifies second-pass stability without mutating checked-in fixtures. Add cases through fixture files, not case-specific runner branches. Preserve CRLF/mixed endings through `.gitattributes` and the missing-final-newline fixture's bytes. Add focused helper tests only for behavior that is not clearly expressed by file fixtures.

## Pull Requests

For artwork changes, follow [Logo Maintenance](DESIGN.md#logo). Keep the editable SVG, license/provenance, descriptive alternative text, and 160-pixel README placement. Inspect full-size and light/dark README rendering; `npm test` checks that the real installed archive retains the logo. Keep generated previews outside the repository.

Keep the primary checkout on `master`; use a separate worktree and `<username>/<topic>` branch for each PR. For example, after inspecting existing branches and worktrees:

```sh
git worktree add -b dblock/implementation ../eslint-plugin-markdown-preferences-paragraph-wrap-implementation master
```

Preserve unrelated work. Prefer one coherent commit per PR and squash multiple topic-branch commits before pushing. Squash-merge PRs; do not use merge commits. Do not push development changes directly to `master`, force-push `master`, amend without approval, or merge/publish/tag without explicit authorization. If a prerequisite PR remains open, obtain the appropriate stacked-PR workflow before creating a dependent PR.

Update affected documentation and add CHANGELOG entries for features, improvements, and fixes, but not minor typos or the initial scaffold. Use `- [#123](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/pull/123): Description - [@dblock](https://github.com/dblock).` with the actual PR number and contributor. Append entries chronologically above `- Your contribution here.` in the Next section. Predict the PR number before opening when reliable, then verify it and correct mismatches without unauthorized amending or force-pushing.

Feature additions increment minor versions in the same PR: reset patch for `0.x`, preserve patch for `1.x` and later. Ask whether to bump major for breaking changes. Synchronize the package manifest and lockfile; see [Releasing](RELEASING.md).

Include the Copilot co-author trailer in AI-assisted commits and disclose AI authorship on behalf of `@dblock` in PRs/comments. Link related issues with closing references; leave them open until the PR merges. State actual validation and pending CI honestly.

The authorized manual release workflow is the sole direct-push exception: release-it publishes the validated npm archive through OIDC, atomically pushes the release commit/tag, creates a GitHub Release, and validates/pushes the next development version. Project hooks format the changelog, validate the exact archive and metadata, and verify pushed refs and registry integrity. Publication precedes the Git push, so a later failure requires recovery rather than an automatic rerun. It never runs on PR merges, has no dry-run input, and requires the `release` environment restricted to `master`. The no-App setup removes the platform PR requirement for all writers, not only Actions; force-push and branch-deletion protections remain active. Ordinary development stays PR-based. Opening or merging its setup PR does not authorize dispatching publication; follow [Releasing](RELEASING.md).

After merging, fetch with pruning, verify the merged state of the PR on GitHub, and inspect its worktree for dirty/untracked files and dependent PRs. Remove only clean, no-longer-needed topic worktrees with `git worktree remove`, then delete their local branches. If squash ancestry requires `git branch -D`, first verify that no unmerged or dependent work would be lost. Never remove `master`, active PR branches, or dirty worktrees. Prune stale worktree metadata, verify cleanup, and report blocked cleanup.

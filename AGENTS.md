# Working on ESLint Plugin Markdown Preferences Paragraph

Read [CONTRIBUTING](CONTRIBUTING.md) and [DESIGN](DESIGN.md) before changing code.

## Scope and Invariants

The `paragraph-wrap` rule has one `width` option shared by every paragraph; omitting it skips checks. There are no container-specific settings or URL exemptions. This is not a full Markdown formatter or an upstream `max-len` replacement.

Numeric widths enforce safe greedy reflow, not only a maximum line length. Changing the configured width must reflow existing shorter lines while preserving intentional hard-break boundaries; already canonical wrapping stays untouched.

The plugin entry point is `src/index.js`, and the rule is `src/rules/paragraph-wrap.js`. Tests live in `test/`, fixtures in `test/fixtures/integration/`, and shared test support in `test-support/`. Use public ESLint and Markdown language APIs, not upstream internal imports or global dependency mutation. Fixes must preserve source offsets, inline literals, hard breaks, container structure, and line endings, and stabilize on a second pass. Unsafe edits must remain report-only. Require AST equivalence under every public dialect matching the original document; do not guess the active language or rewrite unmatched extension syntax.

## Setup and Validation

Use Node.js `26.13.0` from `.nvmrc` for development. The package supports Node.js `^22.13.0 || >=24.0.0`, ESLint 9.39 or later within 9.x and 10.x, and `@eslint/markdown` 8.x. Documentation spelling tools require Node.js 22.18 or later. Verify and prefer current stable releases when selecting or updating tools, while preserving supported-runtime compatibility.

Run `npm ci`, then `npm test`, `npm run lint`, and `npm run package:check`. A focused API fixture test is `node --test test/plugin.test.js`; coverage is `npm run test:coverage`. The full test command already includes the packaged CLI fixture suite; `npm run package:check` runs that suite alone, so reuse its result instead of immediately repeating it. Run tests and lint before every push, including PR updates. Run final validation before committing and reuse it for the push only if tested content and configuration have not changed. When packaging or public exports change, validate the real `npm pack` artifact in a temporary consumer.

Keep Test, Lint, and Package workflows separate and retain coverage with Coveralls. Test matrices use explicit inline `matrix.entry` records without `include`/`exclude`. `npm run lint` uses ESLint for source, embedded JavaScript examples, and Markdown structure/prose/spelling/title case; a YAML-aware checker handles workflow/job/step display-name title case. Markdown checks use `@eslint/markdown`, `eslint-plugin-markdown-preferences`, and this plugin's public export with `width: "nowrap"`. Native spelling uses public CSpell dictionary/text APIs in `scripts/documentation-plugin.js` and the reviewed `.spellcheck.txt`; do not reintroduce Markdownlint tools or mutate dependency ASTs to fake JavaScript spelling support. Embedded examples may leave variables unused because they are standalone excerpts; do not broadly disable source checks. Intentional fixtures are excluded from documentation linting; preserve their expected bytes and targeted Git attributes.

## Documentation and Versions

Keep Markdown prose paragraphs on one source line. Human-readable headings and YAML display names use title case, preserving proper names, acronyms, expressions, and code identifiers. Add reviewed vocabulary to `.spellcheck.txt`, not broad spelling suppressions. Documentation file fixtures live in `test/fixtures/documentation/`; tests load the actual ESLint configs and check diagnostics, fixes, and stability. Markdown/spelling fixtures are skipped only on runtimes below their Node 22.18 tooling minimum; package API/CLI fixtures still run on Node 22.13.

Update affected documentation. Features, improvements, and fixes require a CHANGELOG entry with the actual PR number and contributor attribution; minor typos and the initial scaffold do not. Predict a PR number before opening when reliable, then verify and correct it. Append entries above the final placeholder in chronological order.

Preserve the original editable `assets/logo.svg`, its MIT licensing, accessible metadata, and 160-pixel README placement above the title. Follow [Logo Maintenance](DESIGN.md#logo); inspect full-size and light/dark README rendering after artwork changes. The logo must remain in the npm archive, and generated previews must not be committed.

For features, increment the minor version in the same PR; for `0.x`, reset patch to zero (`0.1.1` to `0.2.0`); for `1.x` and later, preserve patch (`5.3.1` to `5.4.1`). For breaking changes, ask whether to bump major. Synchronize `package.json` and `package-lock.json`; metadata derives its version from the package manifest.

Release automation uses development-only `release-it` and `scripts/release.js` on Node 26.13.0. Tests in `test/release.test.js` cover project-owned changelog/version/metadata/registry guards and one isolated release integration without publishing; CLI/integration checks skip older runtimes below release-it's supported minimum. Do not recreate release-it's Git/npm failure matrix. Preserve the checked-in version as the default, validate optional stable-version overrides, and require meaningful Next notes. `PARAGRAPH_WRAP_PACKAGE_ARCHIVE` makes the existing packed-consumer suite validate the exact release tarball rather than creating a replacement.

## Git and Pull Requests

Keep the primary checkout on `master`. Work in a separate worktree for each PR on `<username>/<topic>`, using `dblock/scaffold` or `dblock/implementation`. Preserve unrelated changes and never overwrite another checkout. Prefer one coherent commit, and squash multiple PR-branch commits before pushing. Squash-merge PRs; do not use merge commits. No direct development commits or pushes to `master`, no force-push to `master`, and no amending or force-pushing without authorization.

Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` in AI-assisted commits and disclose AI authorship on behalf of `@dblock` in PRs and comments. Use closing issue references instead of manually closing issues with implementation PRs.

After a PR merges, fetch with pruning and verify its merged state through GitHub. Inspect worktrees for dirty/untracked files and dependent PRs; remove only clean, no-longer-needed topic worktrees and branches. A squash-merged branch may need `git branch -D`, but only after verifying no unmerged work or dependent PR would be lost. Never delete `master` or active/dirty worktrees; report blocked cleanup. Prune metadata and verify cleanup.

The explicitly authorized release exception is `.github/workflows/release.yml`: a manual dispatch validates and publishes the exact archive through npm OIDC, atomically pushes the release commit/tag, creates the GitHub Release, and validates/pushes the next development version directly to `master`. Use release-it's native version, Git, npm, and GitHub operations; keep project hooks for changelog formatting and artifact validation. The clean-check hook replaces `git.requireCleanWorkingDir` so native destructive rollback handlers stay disabled. Verify pushed refs before GitHub Release creation; npm publication may already have succeeded when Git fails. Ordinary development remains PR-based. The no-App setup removes the platform's PR requirement for all writers; active force-push and branch-deletion protections remain, without bypass actors. Keep the release environment restricted to `master`, the workflow manual-only, and release pushes fast-forward-only. Do not add stored npm tokens, roll back published artifacts, delete tags, or bypass concurrent changes.

Do not merge, publish, tag, create releases, configure credentials, or overwrite published versions/tags without explicit authorization. See [Releasing](RELEASING.md); opening or merging the setup PR does not authorize dispatching a release.

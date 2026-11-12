# Releasing

Use **Actions > Release > Run workflow** on `master` only after explicit release authorization. Dispatch publishes a real release; opening or merging a PR does not authorize publication.

## Release Tooling

The manual caller in `.github/workflows/release.yml` uses [npm-package-release](https://github.com/dblock/npm-package-release) `v0.1.1`, matching the exact development dependency. Upgrade the dependency and reusable workflow together. Release validation uses Node.js 26.13.0 and npm 12.2.2; the plugin's public runtime requirements are unchanged.

`npr.config.js` selects `IntrideaChangelog` for `## <version> (Next)` and `- Your contribution here.`. Its preparation hook updates only the README Installation section to the released version; next-development preparation leaves that pin unchanged. Default validation runs `npm test` and `npm run lint`. The artifact validator runs `npm run package:check` with `PACKAGE_ARCHIVE` pointing at the exact retained archive, exercising installed ESLint check/fix/stability fixtures rather than rebuilding it.

Keep package/lockfile versions and the Next heading synchronized, with meaningful release notes above the placeholder. The checked-in version is the default release candidate; an optional numeric version overrides it.

## Trusted Publishing

The package already exists on npm. Keep the existing GitHub Actions trusted publisher; no bootstrap or stored npm token is needed:

| Setting | Value |
| --- | --- |
| Organization or User | `dblock` |
| Repository | `eslint-plugin-markdown-preferences-paragraph` |
| Workflow Filename | `release.yml`, the caller filename |
| Environment | `release` |
| Direct Publishing | Enabled |

Trusted publication was verified for 0.2.0 on 2026/11/08: registry bytes, GitHub Release archive/checksum, and the release commit agree. Provenance identifies this repository and [run 42528405739](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/runs/42528405739). That connection satisfied its first-publication requirement. The reusable-workflow migration keeps the caller filename and environment; its first actual OIDC publication remains untested until an authorized release.

The `release` environment allows only `master`. The approved direct-push setup allows all writers to push, not only Actions; ordinary development still requires PRs. Force-push and branch-deletion protections remain active without bypass actors. The caller grants `contents: write` and `id-token: write`; no npm token or `NODE_AUTH_TOKEN` is configured.

Changing publisher settings, credentials, or protections requires separate authorization. If a new connection is required, follow the tool's [setup instructions](https://github.com/dblock/npm-package-release/blob/v0.1.1/docs/usage.md#new-project-setup), complete browser 2FA locally, and verify its current expiry policy; never share tokens or codes.

## Validate and Dispatch

Before requesting publication, run local checks and review the separate Test, Lint, and Package CI results:

```sh
npm ci
npm run test:coverage
npm run lint
```

The coverage command includes actual packed consumers and an isolated release simulation with local Git and simulated publication, never npm publishing.

After explicit authorization:

```sh
gh workflow run release.yml --repo dblock/eslint-plugin-markdown-preferences-paragraph --ref master
```

To select a numeric override, append `-f version=0.2.1`, choosing an unpublished version. Do not run `npm run release` as a dry run: it invokes `npr release` and can publish. No release is dispatched automatically on merge.

## Sequence and Recovery

The reusable workflow requires manual dispatch on the default branch and uses the `release` environment and non-canceling repository concurrency. It prepares and validates the release, builds the archive and recovery bundle, and requires a successful artifact upload before publication.

Publication independently repeats preparation and reconciles matching outputs. It publishes the tested archive through OIDC, atomically pushes the matching release commit/tag, creates the GitHub Release, validates and pushes the next development patch, then confirms the explicit released version and retained archive against npm. Missing-version propagation uses bounded retries and records an unverified timeout without blocking GitHub Releases or development preparation; other errors remain failures.

Prepared and final diagnostic artifacts are uploaded separately and retained for 30 days, including hidden files. Preserve the complete artifact directory: `release.json`, archive, notes, `release.bundle`, and `next.bundle` when present. Unlike the old workflow, recovery is not based on `.release/metadata.patch`. Read the run summary and [recovery contract](https://github.com/dblock/npm-package-release/blob/v0.1.1/docs/recovery.md) before acting.

Never blindly rerun publication. Inspect registry version/checksums, remote refs, hosted releases, and retained evidence first; a failed command can follow successful publication. `npm exec --offline -- npr verify --artifacts /path/to/retained-directory` verifies without publishing or modifying refs. Any retry or completion of missing release steps requires authorization. Never republish an existing version, move/delete release tags, force-push `master`, or reset another writer's work.

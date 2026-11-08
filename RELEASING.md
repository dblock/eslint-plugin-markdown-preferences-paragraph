# Releasing

Use **Actions > Release > Run workflow** on `master`. A dispatch requests a real release; there is no dry-run input. Opening or merging the workflow setup PR does not authorize publication. Finish the one-time setup and review the candidate before dispatching.

## One-time Setup

The package is initially unpublished. npm requires an existing package before its trusted publisher can be configured, unlike RubyGems pending publishers. The approved bootstrap uses npm staged publishing: stage a separate `0.0.1-bootstrap` candidate to establish the public `0.0.0-stage` placeholder on npm, then configure the trusted publisher and run the normal workflow for the real `0.1.0` release. This keeps changelog, tag, GitHub Release, and next-version preparation in release-it rather than creating bootstrap metadata PRs.

Use npm 11.15.0 or later for staging and trusted-publisher configuration, with a compatible Node version. Log in and complete account-level 2FA locally; never share credentials. Prepare the bootstrap tarball from an isolated copy with version `0.0.1-bootstrap`, leaving tracked package and lockfile versions at `0.1.0`, then stage it:

```sh
npm stage publish .release/eslint-plugin-markdown-preferences-paragraph-0.0.1-bootstrap.tgz --access public --tag bootstrap
```

Keep the bootstrap stage pending until the real `0.1.0` release succeeds. Do not stage `0.1.0`: staged and published versions share the same unique version index. Do not approve the bootstrap candidate or reject it before the real release exists; rejecting the only stage can remove the placeholder and trigger the 24-hour npm unpublish lock.

Create an npm trusted publisher at **Package > Settings > Trusted Publisher** with owner `dblock`, repository `eslint-plugin-markdown-preferences-paragraph`, workflow filename `release.yml`, and environment `release`. Explicitly allow direct `npm publish`, not only staged publication; staged approval requires a human and is not this workflow. Create the connection just before its first automated release: a new connection expires if its first successful publish does not happen within two days.

The GitHub `release` environment is configured for only `master`, without required reviewers. Writers can dispatch releases; add maintainer reviewers if approval before publication is desired. The approved no-App setup removes the default branch's PR requirement, allowing all writers to push directly, while preserving active force-push and deletion protections without bypass actors. Ordinary development must still use PRs.

After verifying the real release, reject the pending bootstrap stage with `npm stage reject <stage-id>`. Do not unpublish the public placeholder or the released package.

The workflow uses Node 26.13.0 and requires npm 11.5.1 or later. It uses the built-in `GITHUB_TOKEN` for Git and GitHub Releases, with `contents: write` and `id-token: write`. No GitHub App, stored npm token, or `NODE_AUTH_TOKEN` is needed. npm automatically supplies provenance for this public package and repository.

After verifying trusted publication, select **Require two-factor authentication and disallow tokens** in npm publishing-access settings. This does not disable OIDC. Never put registry credentials into the repository or this conversation.

## Prepare and Dispatch

Keep `package.json`, `package-lock.json`, and `## <version> (Next)` synchronized. Feature PRs choose their version according to the contributor policy; the workflow defaults to that checked-in version and automatically prepares the next patch after release. Require actual changelog entries, not just `- Your contribution here.`.

Run local validation and confirm the separate Test, Lint, and Package checks before requesting publication:

```sh
npm ci
npm run test:coverage
npm run lint
```

The coverage command includes real packed-package CLI consumers; do not immediately repeat `package:check`. Release-tool tests use isolated Git repositories and simulated npm responses, never actual publication.

After explicit release authorization, dispatch from `master`:

```sh
gh workflow run release.yml --repo github.com/dblock/eslint-plugin-markdown-preferences-paragraph --ref master
```

To override the checked-in version, provide a stable version without a `v` prefix:

```sh
gh workflow run release.yml --repo github.com/dblock/eslint-plugin-markdown-preferences-paragraph --ref master -f version=0.2.0
```

Overrides cannot be older than the checked-in version. Prerelease versions are not supported. Concurrent release runs are serialized, and source changes after dispatch cause failure rather than rebasing or overwriting another writer.

## Automated Sequence

Actions checks out the exact dispatched commit and runs only on `master` in the restricted release environment, using the pinned Node runtime. Hooks require a clean installation, meaningful release notes, an unpublished version, and an absent tag. Release-it updates version declarations; hooks date the Next section in UTC, remove its placeholder while preserving prior entries, and update the README npm installation pin to the release version before packing.

The hooks pack once to `.release/package.tgz`, retain a checksum and metadata patch, run lint, and pass that exact archive to the full tests through `PARAGRAPH_WRAP_PACKAGE_ARCHIVE`. The real consumer suite inspects and installs it, checks version and logo integrity, and exercises ESLint check/fix/stability fixtures. Release changes are limited to package version fields, the changelog, and README. Immediately before publication, hooks reject changed metadata/artifacts or an advanced remote `master`.

Release-it's native npm publisher publishes that retained tarball through OIDC, without repacking. Its native Git plugin then commits the metadata, creates the annotated tag, and atomically pushes the commit/tag. Before creating the GitHub Release, a hook verifies that the remote branch/tag match the release commit and that the registry version/integrity match the validated archive. Release-it attaches the tarball/checksum to the GitHub Release.

After publication and GitHub Release creation succeed, a second release-it run increments patch, creates the new Next section and placeholder through its changelog hook, runs lint and full tests for that next version, and commits/pushes its metadata. The README installation pin stays at the released version, not the unpublished development version. This run does not publish, create tags, or create another GitHub Release. No ordinary development commits are authorized to bypass PRs.

## Failure Recovery

Download the run's release artifacts before retention expires: the tarball, checksum, and release metadata patch are retained for 14 days even when later stages fail. Do not blindly rerun a failed release; its tag or npm version may already exist, and the workflow deliberately rejects duplicates. Native destructive rollback handlers are disabled; prepared metadata is not reset on failure.

Check the remote tag/commit, npm version and `dist.integrity`, GitHub Release, and current `master` before choosing recovery. npm is published before Git is pushed: if Git fails after successful publication, reconstruct the release metadata from the exact dispatched source and retained patch, reconcile any newer work without overwriting it, and finish the missing commit/tag push only with explicit authorization. If npm publication failed, investigate authentication and use the original validated tarball through an explicitly authorized workflow or interactive publication. Registry visibility can lag; verify it before treating a missing lookup as a failed publication. If only the GitHub Release or next-version preparation failed, finish those missing steps. Never overwrite registry versions, force-push `master`, delete release tags, unpublish, or reset another writer's work.

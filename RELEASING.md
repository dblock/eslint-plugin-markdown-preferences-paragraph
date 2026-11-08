# Releasing

**Provisional:** No release automation, credentials, trusted publisher, or published package exists. These instructions describe the intended manual release procedure and do not authorize publishing, tags, or releases.

## Version and Validation

Synchronize `package.json` and `package-lock.json`, including the lockfile root version. The plugin's metadata reads the manifest version. Prepare release metadata through a reviewed PR: finalize the CHANGELOG section as `## <version> (YYYY/MM/DD)` and validate the release candidate.

```sh
npm ci
npm run test:coverage
npm run lint
```

Run tests and lint before every push. Keep the Test, Lint, and Package workflows separate and confirm their release-candidate checks succeed.

## Artifact and Publication

The coverage command runs `npm test`, including real packed-artifact CLI fixtures; `npm run package:check` runs only that integration suite when needed. Do not immediately repeat equivalent validation against unchanged files.

After explicit authorization, pack the reviewed release commit with `npm pack --json`, inspect the resulting archive, and install that exact archive in a clean consumer. Verify public exports and actual ESLint check/fix behavior. `npm run package:check` validates and deletes its temporary archive; it does not preserve an artifact for publication.

Authenticate only through an explicitly authorized npm account or approved trusted-publishing setup; never add credentials to this repository. Check registry name ownership and that the intended version is unpublished. Publish the inspected tarball with `npm publish <archive.tgz> --access public`, not a newly packed checkout. Publication must wait for authorization and approved functionality.

## Registry and Tag Verification

After an authorized publication, use `npm view eslint-plugin-markdown-preferences-paragraph-wrap@<version> version dist.integrity dist.tarball` to verify the registry version and artifact integrity. Confirm that the downloaded registry tarball matches the validated artifact.

Create and push an authorized `v<version>` tag only at the reviewed release commit, then verify its remote target and registry correspondence. Never overwrite a published version or release tag. Prepare the next development version and Next changelog section through a separate PR; there is no direct-default-branch release-automation exception.

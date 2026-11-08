import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  developmentChangelog, nextVersion, registryVersion, releaseChangelog, releaseStep,
  stableVersion, validateMetadata, waitForRegistryVersion,
} from "../scripts/release.js";

const fixtures = new URL("./fixtures/release/", import.meta.url);
for (const name of await readdir(fixtures)) {
  const directory = new URL(`${name}/`, fixtures);
  const metadata = JSON.parse(await readFile(new URL("case.json", directory), "utf8"));
  test(`release changelog: ${name}`, async () => {
    const input = await readFile(new URL("input.md", directory), "utf8");
    const release = () => releaseChangelog(input, metadata.current, metadata.version, metadata.date);
    if (metadata.error) {
      assert.throws(release, new RegExp(metadata.error, "u"));
      return;
    }
    const result = release();
    assert.equal(result.text, await readFile(new URL("expected.md", directory), "utf8"));
    assert.equal(developmentChangelog(result.text, nextVersion(metadata.version)),
      await readFile(new URL("next.md", directory), "utf8"));
    assert.throws(() => releaseChangelog(input, "1.0.0", metadata.version, metadata.date), /heading/u);
    assert.throws(() => developmentChangelog(input, "0.3.0"), /duplicate/u);
  });
}

test("release inputs reject shell syntax, unsupported versions, and numeric overflow", () => {
  for (const version of ["v1.0.0", "1.0.0-beta.1", "01.0.0", "1.0.0; echo bad", "1.0.9007199254740992"]) {
    assert.throws(() => stableVersion(version));
  }
  assert.equal(nextVersion("1.2.9"), "1.2.10");
  assert.throws(() => nextVersion("1.0.9007199254740991"));
});

test("version changes cannot hide dependency or lockfile changes", () => {
  const manifest = { version: "0.1.0", dependencies: { example: "1.0.0" } };
  validateMetadata(manifest, { ...manifest, version: "0.2.0" }, "0.2.0");
  assert.throws(() => validateMetadata(manifest,
    { version: "0.2.0", dependencies: { example: "2.0.0" } }, "0.2.0"), /Only release versions/u);
  const lock = { version: "0.1.0", packages: { "": { version: "0.1.0" }, example: { version: "1.0.0" } } };
  const updated = JSON.parse(JSON.stringify(lock));
  updated.version = updated.packages[""].version = "0.2.0";
  validateMetadata(lock, updated, "0.2.0");
  updated.packages.example.version = "2.0.0";
  assert.throws(() => validateMetadata(lock, updated, "0.2.0"));
});

test("only registry E404 means an unpublished version", () => {
  const missing = Object.assign(new Error("missing"), { stdout: '{"error":{"code":"E404"}}' });
  assert.equal(registryVersion("example", "0.1.0", () => { throw missing; }), null);
  for (const stdout of ['{"error":{"code":"E401"}}', "network failure"]) {
    const error = Object.assign(new Error("failed"), { stdout });
    assert.throws(() => registryVersion("example", "0.1.0", () => { throw error; }), /failed/u);
  }
});

test("registry confirmation retries temporary E404s using fresh spaced lookups", async () => {
  const published = { version: "0.2.0", "dist.integrity": "sha512-example" };
  let lookups = 0;
  const waits = [];
  const result = await waitForRegistryVersion("example", "0.2.0", {
    execute: (program, args) => {
      assert.equal(program, "npm");
      assert.ok(args.includes("--prefer-online"));
      if (++lookups < 3) {
        throw Object.assign(new Error("missing"), { stdout: '{"error":{"code":"E404"}}' });
      }
      return JSON.stringify(published);
    },
    wait: async (milliseconds) => { waits.push(milliseconds); },
  });
  assert.deepEqual(result, published);
  assert.equal(lookups, 3);
  assert.equal(waits.length, 2);
  assert.ok(waits.every((milliseconds) => milliseconds > 0));
});

test("registry confirmation is bounded and only retries genuine E404 errors", async () => {
  let lookups = 0;
  assert.equal(await waitForRegistryVersion("example", "0.2.0", {
    execute: () => {
      assert.ok(++lookups < 100, "Do not retry indefinitely.");
      throw Object.assign(new Error("missing"), { stdout: '{"error":{"code":"E404"}}' });
    },
    wait: async () => {},
  }), null);
  assert.ok(lookups > 1);
  for (const stdout of ['{"error":{"code":"E401"}}', '{"error":{"code":"E500"}}', "network failure"]) {
    lookups = 0;
    await assert.rejects(waitForRegistryVersion("example", "0.2.0", {
      execute: () => {
        lookups++;
        throw Object.assign(new Error("failed"), { stdout });
      },
      wait: async () => { assert.fail("Do not wait on authentication or network errors."); },
    }), /failed/u);
    assert.equal(lookups, 1);
  }
  for (const output of [
    "null", "{}", "not json",
    '{"version":null,"dist.integrity":"sha512-example"}',
    '{"version":"0.2.0","dist.integrity":null}',
  ]) {
    lookups = 0;
    await assert.rejects(waitForRegistryVersion("example", "0.2.0", {
      execute: () => { lookups++; return output; },
      wait: async () => { assert.fail("Do not retry malformed metadata."); },
    }));
    assert.equal(lookups, 1);
  }
});

test("final verification records timeouts and checks the release after development advances", async () => {
  const bytes = "validated archive";
  const published = {
    version: "0.2.0", "dist.integrity": `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
  for (const fixture of [
    { record: null, message: /could not be verified.*do not republish/u, summary: true },
    { record: published, message: /Verified npm release 0\.2\.0/u },
    { record: { ...published, version: "0.2.1" }, error: /published version/u },
    { record: { ...published, "dist.integrity": "sha512-wrong" }, error: /artifact must match/u },
  ]) {
    const directory = await mkdtemp(join(tmpdir(), "paragraph-registry-verification-"));
    const cwd = process.cwd();
    const summary = process.env.GITHUB_STEP_SUMMARY;
    try {
      process.chdir(directory);
      await mkdir(".release");
      await writeFile("package.json", '{"name":"example","version":"0.2.1"}');
      await writeFile("CHANGELOG.md", await readFile(new URL("valid/input.md", fixtures)));
      await writeFile(".release/package.tgz", bytes);
      if (fixture.summary) {
        process.env.GITHUB_STEP_SUMMARY = join(directory, "summary.md");
        await writeFile("summary.md", "Previous step summary.\n");
      } else {
        delete process.env.GITHUB_STEP_SUMMARY;
      }
      const verify = () => releaseStep("verify", "0.2.0", {
        execute: (program, args) => {
          assert.equal(program, "npm", "Final verification must not compare development refs to the release tag.");
          assert.ok(args.includes("example@0.2.0"));
          if (fixture.record === null) {
            throw Object.assign(new Error("missing"), { stdout: '{"error":{"code":"E404"}}' });
          }
          return JSON.stringify(fixture.record);
        },
        wait: async () => {},
      });
      if (fixture.error) {
        await assert.rejects(verify(), fixture.error);
        await assert.rejects(readFile(".release/verification.txt"), { code: "ENOENT" });
      } else {
        await verify();
        assert.match(await readFile(".release/verification.txt", "utf8"), fixture.message);
        if (fixture.summary) {
          const text = await readFile("summary.md", "utf8");
          assert.ok(text.startsWith("Previous step summary.\n"));
          assert.match(text, fixture.message);
        }
      }
    } finally {
      if (summary === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = summary;
      process.chdir(cwd);
      await rm(directory, { recursive: true, force: true });
    }
  }
});

const [major, minor, patch] = process.versions.node.split(".").map(Number);
const supportsRelease = major >= 26 || (major === 24 && minor >= 15) ||
  (major === 22 && (minor > 22 || (minor === 22 && patch >= 2)));

test("release CLI rejects local runs before invoking release-it", { skip: !supportsRelease }, () => {
  assert.throws(() => execFileSync(process.execPath, [
    fileURLToPath(new URL("../scripts/release.js", import.meta.url)),
  ], { encoding: "utf8", stdio: "pipe", env: { ...process.env, GITHUB_ACTIONS: "" } }), /Use Actions/u);
});

test("release hooks validate one archive and prepare the next version", { skip: !supportsRelease }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "paragraph-wrap-release-"));
  const remote = join(directory, "remote.git");
  const root = join(directory, "source");
  await mkdir(root);
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  try {
    git("init", "--bare", remote);
    git("init", "-b", "master");
    git("config", "user.name", "Release Test");
    git("config", "user.email", "release@example.invalid");
    git("remote", "add", "origin", remote);
    await writeFile(join(root, ".gitignore"), ".release/\n");
    const manifest = {
      name: "release-fixture", version: "0.2.1", type: "module",
      repository: { type: "git", url: "git+https://github.com/example/release-fixture.git" },
    };
    const released = "0.3.0";
    const readme = `# Release Fixture\n\nnpm install --save-dev eslint @eslint/markdown eslint-plugin-markdown-preferences-paragraph@${manifest.version}\n`;
    await writeFile(join(root, "README.md"), readme);
    await writeFile(join(root, "package.json"), JSON.stringify(manifest));
    await writeFile(join(root, "package-lock.json"), JSON.stringify({
      name: manifest.name, version: manifest.version, lockfileVersion: 3, packages: { "": manifest },
    }));
    await writeFile(join(root, "CHANGELOG.md"), await readFile(new URL("valid/input.md", fixtures)));
    const config = JSON.parse(await readFile(new URL("../.release-it.json", import.meta.url), "utf8"));
    // Exercise the GitHub preflight without making any GitHub API requests.
    config.hooks["after:release"] = [config.hooks["before:github:release"], ...config.hooks["after:release"]];
    config.github = false;
    await writeFile(join(root, ".release-it.json"), JSON.stringify(config));
    await mkdir(join(root, "scripts"));
    await writeFile(join(root, "scripts/release.js"), `
import { releaseStep } from ${JSON.stringify(new URL("../scripts/release.js", import.meta.url).href)};
await releaseStep(process.argv[2], process.argv[3]);
`);
    const bin = join(root, "bin");
    await mkdir(bin);
    const npm = execFileSync("which", ["npm"], { encoding: "utf8" }).trim();
    const shim = `#!${process.execPath}
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import process from "node:process";
const args = process.argv.slice(2);
if (args[0] === "view") {
  assert.ok(args.includes("--prefer-online"));
  if (!existsSync(".release/published")) {
    console.log('{"error":{"code":"E404"}}');
    process.exit(1);
  }
  assert.ok(existsSync(".release/next-tested"), "Prepare and validate development before registry confirmation.");
  assert.notEqual(JSON.parse(readFileSync("package.json", "utf8")).version,
    readFileSync(".release/published", "utf8"));
  console.log(JSON.stringify({version:readFileSync(".release/published", "utf8"),
    "dist.integrity":"sha512-" + createHash("sha512").update("validated artifact").digest("base64")}));
} else if (args[0] === "pack") {
  assert.ok(!existsSync(".release/package.tgz"), "Pack only once.");
  assert.ok(readFileSync("README.md", "utf8").includes(
    "eslint-plugin-markdown-preferences-paragraph@" + JSON.parse(readFileSync("package.json", "utf8")).version));
  writeFileSync(".release/fixture.tgz", "validated artifact");
  console.log(JSON.stringify([{filename:"fixture.tgz"}]));
} else if (args[0] === "test") {
  if (process.env.PARAGRAPH_WRAP_PACKAGE_ARCHIVE) {
    assert.equal(readFileSync(process.env.PARAGRAPH_WRAP_PACKAGE_ARCHIVE, "utf8"), "validated artifact");
    writeFileSync(".release/tested", "tested");
  } else {
    assert.ok(existsSync(".release/published"));
    writeFileSync(".release/next-tested", "tested");
  }
} else if (args[0] === "run" && args[1] === "lint") {
  process.exit(0);
} else if (args[0] === "publish") {
  assert.equal(args[1], ".release/package.tgz");
  assert.equal(readFileSync(args[1], "utf8"), "validated artifact");
  assert.ok(existsSync(".release/tested"), "Validate the archive before publishing.");
  assert.ok(!existsSync(".release/published"), "Do not publish the next development version.");
  writeFileSync(".release/published", JSON.parse(readFileSync("package.json", "utf8")).version);
} else {
  process.stdout.write(execFileSync(${JSON.stringify(npm)}, args, {encoding:"utf8"}));
}
`;
    await writeFile(join(bin, "npm"), shim);
    await chmod(join(bin, "npm"), 0o755);
    git("add", ".");
    git("commit", "-m", "Fixture\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>");
    git("push", "-u", "origin", "master");
    const cli = fileURLToPath(new URL("../scripts/release.js", import.meta.url));
    execFileSync(process.execPath, [cli], {
      cwd: root, encoding: "utf8", stdio: "pipe",
      env: {
        ...process.env, GITHUB_ACTIONS: "true", RELEASE_VERSION: released,
        GITHUB_STEP_SUMMARY: join(root, ".release/summary.md"),
        PARAGRAPH_WRAP_PACKAGE_ARCHIVE: "", PATH: `${bin}:${process.env.PATH}`,
      },
    });
    const source = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    assert.equal(source.version, nextVersion(released));
    assert.equal(JSON.parse(git("show", `v${released}:package.json`)).version, released);
    assert.match(await readFile(join(root, "CHANGELOG.md"), "utf8"), /^## 0\.3\.1 \(Next\)$/mu);
    const releasedReadme = readme.replace(`@${manifest.version}`, `@${released}`);
    assert.equal(git("show", `v${released}:README.md`), releasedReadme);
    assert.equal(await readFile(join(root, "README.md"), "utf8"), releasedReadme);
    assert.match(await readFile(join(root, ".release/verification.txt"), "utf8"), /Verified npm release/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

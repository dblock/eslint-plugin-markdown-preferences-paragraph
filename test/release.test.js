import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const [major, minor] = process.versions.node.split(".").map(Number);
const supportsRelease = (major === 22 && minor >= 14) || major === 24 || major >= 26;

test("the release configuration preserves README pins and validates the retained archive", {
  skip: !supportsRelease,
}, async (t) => {
  const { ReleaseTestProject } = await import("npm-package-release/testing");
  const { createReleaseWorkflow } = await import("../npr.config.js");
  const project = await ReleaseTestProject.create();
  t.after(() => project.dispose());
  const root = fileURLToPath(new URL("../", import.meta.url));
  await project.copyFiles(root, [
    ".gitignore", "README.md", "CHANGELOG.md", "LICENSE",
    "CONTRIBUTING.md", "DESIGN.md", "RELEASING.md",
    "assets/logo.svg", "test/plugin.test.js", "test/integration.test.js",
  ]);
  await project.copyFiles(root, "{src,test-support}/**/*.js");
  await project.copyFiles(root, "test/fixtures/integration/{numeric-basic,balanced-basic,max-words-basic}/*");
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const { eslint, "@eslint/markdown": markdown, "eslint-plugin-markdown-preferences": preferences } = manifest.devDependencies;
  await project.write("package.json", JSON.stringify({
    ...manifest,
    version: "0.2.1",
    scripts: {
      test: "node --test test/plugin.test.js",
      lint: "node --check src/index.js",
      "package:check": "node --test test/integration.test.js",
    },
    devDependencies: { eslint, "@eslint/markdown": markdown, "eslint-plugin-markdown-preferences": preferences },
  }));
  await project.run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  await project.commit();
  const readme = await readFile(join(project.cwd, "README.md"), "utf8");
  const released = "0.2.2";
  const workflow = createReleaseWorkflow(project.services);
  const prepared = await workflow.prepare({ ...project.options, version: released });
  assert.equal(await project.publisher.view(manifest.name, released), null);
  const result = await workflow.run({ ...project.options, version: released, env: prepared.runtime.env });
  assert.equal(result.verification, "verified");
  const expectedReadme = readme.replace(
    /eslint-plugin-markdown-preferences-paragraph@\d+\.\d+\.\d+/u,
    `eslint-plugin-markdown-preferences-paragraph@${released}`,
  );
  assert.notEqual(expectedReadme, readme);
  assert.equal(await project.remoteFile(`v${released}`, "README.md"), expectedReadme);
  assert.equal(await project.remoteFile("master", "README.md"), expectedReadme);
  const releaseNotes = await project.remoteFile(`v${released}`, "CHANGELOG.md");
  assert.match(releaseNotes, /^## 0\.2\.2 \(\d{4}\/\d{2}\/\d{2}\)$/mu);
  assert.doesNotMatch(releaseNotes, /Your contribution here/u);
  assert.match(await project.remoteFile("master", "CHANGELOG.md"),
    /^## 0\.2\.3 \(Next\)\n\n- Your contribution here\./mu);
  assert.equal(JSON.parse(await project.remoteFile("master", "package.json")).version, "0.2.3");
  const archive = await readFile(project.publisher.archive(manifest.name, released));
  assert.deepEqual(archive, await readFile(project.host.archive(manifest.name, released)));
  assert.deepEqual(archive, await readFile(join(project.artifacts, result.artifact.filename)));
  assert.equal(await project.git("status", "--porcelain"), "");
});

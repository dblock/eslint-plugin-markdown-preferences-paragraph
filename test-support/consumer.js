import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import preferences from "eslint-plugin-markdown-preferences";
import { diagnostics } from "./fixtures.js";

export async function consumer(archivePath = process.env.PARAGRAPH_WRAP_PACKAGE_ARCHIVE) {
  const directory = await mkdtemp(join(tmpdir(), "paragraph-wrap-consumer-"));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    const [archive] = archivePath ? [{ filename: archivePath }] : JSON.parse(execFileSync(
      npm, ["pack", "--json", "--pack-destination", directory],
      { cwd: root, encoding: "utf8" },
    ));
    const paths = archivePath ? execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
      .trim().split("\n").map((path) => path.replace(/^package\//u, ""))
      : archive.files.map((file) => file.path);
    assert.ok(paths.includes("src/rules/paragraph-wrap.js"));
    assert.ok(paths.includes("LICENSE"));
    assert.ok(paths.includes("assets/logo.svg"), "The README logo must be packaged.");
    assert.ok(paths.every((path) =>
      !/^(?:test|test-support|scripts|node_modules|coverage)\//u.test(path) &&
      !path.endsWith(".tgz")
    ), "The archive must exclude development and generated files.");
    await writeFile(join(directory, "package.json"), JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        eslint: ESLint.version,
        "@eslint/markdown": markdown.meta.version,
        "eslint-plugin-markdown-preferences": preferences.meta.version,
      },
    }));
    execFileSync(npm, [
      "install", "--ignore-scripts", "--no-audit", "--no-fund",
      archivePath ?? join(directory, archive.filename),
    ], { cwd: directory, stdio: "pipe" });
    assert.equal(
      JSON.parse(await readFile(join(directory,
        "node_modules/eslint-plugin-markdown-preferences-paragraph/package.json"), "utf8")).version,
      JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version,
      "The installed archive must match the source version being validated.",
    );
    assert.deepEqual(
      await readFile(join(
        directory, "node_modules/eslint-plugin-markdown-preferences-paragraph/assets/logo.svg",
      )),
      await readFile(new URL("../assets/logo.svg", import.meta.url)),
      "The installed package must retain the editable README logo.",
    );
    await copyFile(
      new URL("./configuration.js", import.meta.url),
      join(directory, "configuration.js"),
    );
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    async close() {
      await rm(directory, { recursive: true, force: true });
    },
    async check(fixture) {
      const path = join(directory, fixture.name);
      await mkdir(path);
      const input = join(path, fixture.metadata.fileName ?? "input.md");
      await writeFile(input, fixture.input);
      const config = join(path, "eslint.config.js");
      await writeFile(config, `import markdown from "@eslint/markdown";
import preferences from "eslint-plugin-markdown-preferences";
import plugin from "eslint-plugin-markdown-preferences-paragraph";
import { configuration } from "../configuration.js";
export default [configuration(${JSON.stringify(fixture.metadata)}, { markdown, preferences, plugin })];
`);
      for (const [index, flags] of [[], ["--fix"], ["--fix"]].entries()) {
        const phase = index === 0 ? "before" : "after";
        const result = spawnSync(process.execPath, [
          join(directory, "node_modules/eslint/bin/eslint.js"),
          "--config", "eslint.config.js", "--format", "json", ...flags,
          fixture.metadata.fileName ?? "input.md",
        ], { cwd: path, encoding: "utf8" });
        if (result.error) throw result.error;
        if (fixture.metadata.configurationError) {
          assert.equal(result.status, 2, `${fixture.name}: ${phase}: ${result.stderr}`);
          assert.ok(result.stderr.trim(), fixture.name);
        } else {
          assert.equal(
            result.status,
            fixture.diagnostics[phase].some((message) => message.severity === 2) ? 1 : 0,
            `${fixture.name}: ${phase}: ${result.stderr || result.stdout}`,
          );
          const [lintResult] = JSON.parse(result.stdout);
          assert.deepEqual(
            diagnostics(lintResult.messages), fixture.diagnostics[phase],
            `${fixture.name}: ${phase}: diagnostics`,
          );
        }
        assert.deepEqual(
          await readFile(input),
          index === 0 ? fixture.input : fixture.expected,
          `${fixture.name}: ${index === 2 ? "stability" : phase}: file bytes`,
        );
      }
    },
  };
}

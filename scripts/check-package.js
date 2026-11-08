import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const consumer = await mkdtemp(join(tmpdir(), "paragraph-wrap-consumer-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

try {
  const [archive] = JSON.parse(
    execFileSync(
      npm,
      ["pack", "--json", "--pack-destination", consumer],
      { cwd: root, encoding: "utf8" },
    ),
  );
  const files = archive.files.map((file) => file.path);
  assert.ok(files.includes("src/index.js"));
  assert.ok(files.includes("package.json"));
  assert.ok(files.includes("LICENSE"));
  assert.ok(
    files.every(
      (file) =>
        !/^(?:test|scripts|node_modules|coverage)\//u.test(file) &&
        !file.endsWith(".tgz"),
    ),
    "The archive must exclude development and generated files.",
  );
  process.stdout.write(`Archive: ${files.join(", ")}\n`);

  const { peerDependencies, devDependencies } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: Object.fromEntries(
        Object.keys(peerDependencies).map((name) => [name, devDependencies[name]]),
      ),
    }),
  );
  execFileSync(
    npm,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      resolve(consumer, archive.filename),
    ],
    { cwd: consumer, stdio: "inherit" },
  );
  await writeFile(
    join(consumer, "eslint.config.js"),
    `import markdown from "@eslint/markdown";
import plugin from "eslint-plugin-markdown-preferences-paragraph-wrap";
export default [{
  files: ["**/*.md"],
  plugins: { markdown, "markdown-preferences-paragraph-wrap": plugin },
  language: "markdown/gfm"
}];
`,
  );
  const fixture = new URL("../test/fixtures/scaffold/input.md", import.meta.url);
  const inputPath = join(consumer, "input.md");
  await copyFile(fixture, inputPath);
  const expected = await readFile(fixture);
  for (const flags of [[], ["--fix"], ["--fix"]]) {
    const results = JSON.parse(
      execFileSync(
        process.execPath,
        [
          join(consumer, "node_modules/eslint/bin/eslint.js"),
          "--format",
          "json",
          ...flags,
          "input.md",
        ],
        { cwd: consumer, encoding: "utf8" },
      ),
    );
    assert.deepEqual(results[0].messages, []);
    assert.deepEqual(await readFile(inputPath), expected);
  }
  process.stdout.write("Packed scaffold loads in ESLint; fixture stays unchanged.\n");
} finally {
  await rm(consumer, { recursive: true, force: true });
}

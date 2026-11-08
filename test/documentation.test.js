import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import process from "node:process";
import test from "node:test";
import { ESLint } from "eslint";
import codeConfig from "../eslint.config.js";

const [major, minor] = process.versions.node.split(".").map(Number);
const [eslintMajor, eslintMinor] = ESLint.version.split(".").map(Number);
const supportsSpelling = (major >= 24 || (major === 22 && minor >= 18)) &&
  eslintMajor === 10 && eslintMinor >= 14;
const root = new URL("./fixtures/documentation/", import.meta.url);

function checkDiagnostics(messages, expected, phase) {
  assert.equal(messages.length, expected.length, `${phase}: diagnostic count`);
  for (const [index, fields] of expected.entries()) {
    const message = { ...messages[index], fixable: Boolean(messages[index].fix) };
    for (const [field, value] of Object.entries(fields)) {
      assert.deepEqual(message[field], value, `${phase}: ${field}`);
    }
  }
}

for (const name of (await readdir(root)).sort()) {
  const directory = new URL(`${name}/`, root);
  const metadata = JSON.parse(await readFile(new URL("case.json", directory), "utf8"));
  test(`documentation: ${name}`, {
    skip: metadata.configuration === "markdown" && !supportsSpelling,
  }, async () => {
    const config = metadata.configuration === "code"
      ? codeConfig
      : (await import("../eslint.config-markdown.js")).default;
    const input = await readFile(new URL("input.md", directory), "utf8");
    const expected = await readFile(new URL("expected.md", directory), "utf8");
    const messages = JSON.parse(await readFile(new URL("diagnostics.json", directory), "utf8"));
    const options = { overrideConfigFile: true, overrideConfig: config };
    const file = { filePath: metadata.fileName ?? "documentation.md", warnIgnored: false };
    const eslint = new ESLint(options);
    const [before] = await eslint.lintText(input, file);
    checkDiagnostics(before?.messages ?? [], messages.before, "before");
    const fixer = new ESLint({ ...options, fix: true });
    const [after] = await fixer.lintText(input, file);
    const output = after?.output ?? input;
    assert.equal(output, expected, "fixed text");
    checkDiagnostics(after?.messages ?? [], messages.after, "after");
    const [stable] = await fixer.lintText(output, file);
    assert.equal(stable?.output ?? output, output, "stability");
    checkDiagnostics(stable?.messages ?? [], messages.after, "stability");
  });
}

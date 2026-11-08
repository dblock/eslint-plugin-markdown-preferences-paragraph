import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import plugin from "eslint-plugin-markdown-preferences-paragraph-wrap";

for (const language of ["commonmark", "gfm"]) {
  test(`scaffold loads through the public export with ${language}`, async () => {
    const input = await readFile(
      new URL("./fixtures/scaffold/input.md", import.meta.url),
      "utf8",
    );
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.md"],
          plugins: {
            markdown,
            "markdown-preferences-paragraph-wrap": plugin,
          },
          language: `markdown/${language}`,
        },
      ],
      fix: true,
    });
    const [result] = await eslint.lintText(input, { filePath: "input.md" });
    assert.deepEqual(result.messages, []);
    assert.equal(result.output ?? input, input);
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import { ESLint } from "eslint";
import markdown from "@eslint/markdown";
import plugin from "eslint-plugin-markdown-preferences-paragraph";
import preferences from "eslint-plugin-markdown-preferences";
import { configuration } from "../test-support/configuration.js";
import { diagnostics, fixtures } from "../test-support/fixtures.js";

for (const fixture of await fixtures()) {
  test(fixture.name, async () => {
    const input = fixture.input.toString("utf8");
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [configuration(fixture.metadata, { markdown, preferences, plugin })],
    });
    const filePath = fixture.metadata.fileName ?? "input.md";
    if (fixture.metadata.configurationError) {
      await assert.rejects(eslint.lintText(input, { filePath }));
      assert.deepEqual(fixture.input, fixture.expected);
      return;
    }
    const [before] = await eslint.lintText(input, { filePath });
    assert.deepEqual(diagnostics(before.messages), fixture.diagnostics.before);
    const fixer = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [configuration(fixture.metadata, { markdown, preferences, plugin })],
      fix: true,
    });
    const [after] = await fixer.lintText(input, { filePath });
    const output = after.output ?? input;
    assert.equal(output, fixture.expected.toString("utf8"));
    assert.deepEqual(diagnostics(after.messages), fixture.diagnostics.after);
    const [stable] = await fixer.lintText(output, { filePath });
    assert.equal(stable.output ?? output, output);
    assert.deepEqual(diagnostics(stable.messages), fixture.diagnostics.after);
  });
}

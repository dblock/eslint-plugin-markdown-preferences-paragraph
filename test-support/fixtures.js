import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const ruleId = "paragraph/paragraph-wrap";

export function diagnostics(messages) {
  return messages.map((message) => ({
    ruleId: message.ruleId,
    messageId: message.messageId,
    severity: message.severity,
    line: message.line,
    column: message.column,
    fixable: Boolean(message.fix),
  }));
}

export async function fixtures() {
  const root = new URL("../test/fixtures/integration/", import.meta.url);
  const directories = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(directories.length > 0, "Integration fixtures must not be empty.");
  return Promise.all(directories.map(async (name) => {
    const directory = new URL(`${name}/`, root);
    const metadata = JSON.parse(await readFile(new URL("case.json", directory), "utf8"));
    for (const key of Object.keys(metadata)) {
      assert.ok([
        "language", "languageOptions", "options", "severity",
        "coexistence", "configurationError", "fileName",
      ].includes(key), `${name}: unknown metadata field ${key}`);
    }
    assert.ok(["commonmark", "gfm", "extended-syntax"].includes(metadata.language), name);
    assert.ok(["error", "warn", "off"].includes(metadata.severity ?? "error"), name);
    assert.match(metadata.fileName ?? "input.md", /^input\.(?:md|markdown)$/u);
    for (const key of ["coexistence", "configurationError"]) {
      if (key in metadata) assert.equal(typeof metadata[key], "boolean", name);
    }
    if ("languageOptions" in metadata) {
      assert.ok(metadata.languageOptions && !Array.isArray(metadata.languageOptions) &&
        typeof metadata.languageOptions === "object", name);
    }
    const expectedDiagnostics = JSON.parse(
      await readFile(new URL("diagnostics.json", directory), "utf8"),
    );
    assert.deepEqual(Object.keys(expectedDiagnostics).sort(), ["after", "before"], name);
    for (const phase of ["before", "after"]) {
      assert.ok(Array.isArray(expectedDiagnostics[phase]), name);
      expectedDiagnostics[phase] = expectedDiagnostics[phase].map((message) => {
        for (const key of Object.keys(message)) {
          assert.ok([
            "ruleId", "messageId", "severity", "line", "column", "fixable",
          ].includes(key), `${name}: unknown diagnostic field ${key}`);
        }
        assert.equal(typeof message.messageId, "string", name);
        assert.ok(Number.isInteger(message.line) && message.line > 0, name);
        assert.ok(Number.isInteger(message.column) && message.column > 0, name);
        assert.equal(typeof message.fixable, "boolean", name);
        return { ruleId, severity: 2, ...message };
      });
    }
    return {
      name,
      metadata,
      input: await readFile(new URL("input.md", directory)),
      expected: await readFile(new URL("expected.md", directory)),
      diagnostics: expectedDiagnostics,
    };
  }));
}

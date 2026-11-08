import assert from "node:assert/strict";
import test from "node:test";
import { lint } from "markdownlint/promise";
import MarkdownIt from "markdown-it";
import titleCaseStyle from "markdownlint-rule-title-case-style";

test("the heading rule accepts title case and rejects sentence case", async () => {
  const results = await lint({
    strings: {
      valid: "# Setup and Validation\n",
      invalid: "# Setup and validation\n",
    },
    customRules: [titleCaseStyle],
    markdownItFactory: () => new MarkdownIt({ html: true }),
    config: {
      default: false,
      "title-case-style": { case: "title" },
    },
  });
  assert.equal(results.valid.length, 0);
  assert.equal(results.invalid.length, 1);
  assert.ok(results.invalid[0].ruleNames.includes("title-case-style"));
});

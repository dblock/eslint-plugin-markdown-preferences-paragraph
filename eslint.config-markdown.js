import markdown from "@eslint/markdown";
import preferences from "eslint-plugin-markdown-preferences";
import paragraphWrap from "eslint-plugin-markdown-preferences-paragraph-wrap";
import documentation from "./scripts/documentation-plugin.js";

export default [
  {
    ignores: ["coverage/**", "test/fixtures/**"],
  },
  {
    files: ["*.md"],
    plugins: {
      markdown,
      "markdown-preferences": preferences,
      "markdown-preferences-paragraph-wrap": paragraphWrap,
      documentation,
    },
    language: "markdown/gfm",
    rules: {
      ...markdown.configs.recommended[0].rules,
      ...preferences.configs.standard.rules,
      "markdown/no-duplicate-headings": "error",
      "markdown/no-bare-urls": "error",
      "markdown/no-html": ["error", { allowed: ["img"] }],
      "markdown-preferences/no-heading-trailing-punctuation": "error",
      // Keep both hard-break forms and the previous unaligned-table policy.
      "markdown-preferences/hard-linebreak-style": "off",
      "markdown-preferences/no-text-backslash-linebreak": "off",
      "markdown-preferences/table-pipe-alignment": "off",
      "markdown-preferences/heading-casing": ["error", {
        style: "Title Case",
        preserveWords: [
          "ESLint", "JavaScript", "CommonMark", "GFM", "API", "URLs", "CI",
          "First-Version", "Data-Driven",
        ],
      }],
      "markdown-preferences-paragraph-wrap/paragraph-wrap": ["error", { width: "nowrap" }],
      "documentation/spelling": "error",
      "documentation/first-heading": "error",
      "documentation/final-newline": "error",
    },
  },
];

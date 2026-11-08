import markdown from "@eslint/markdown";
import preferences from "eslint-plugin-markdown-preferences";
import paragraph from "eslint-plugin-markdown-preferences-paragraph";
import proseSpellcheck from "eslint-plugin-prose-spellcheck";
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
      paragraph,
      "prose-spellcheck": proseSpellcheck,
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
      "paragraph/wrap": ["error", { width: "nowrap" }],
      "prose-spellcheck/spellcheck": ["error", {
        dictionaries: ["@cspell/dict-en_us", "@cspell/dict-software-terms", "./.spellcheck.txt"],
        baseDir: import.meta.dirname,
      }],
      "documentation/first-heading": "error",
      "documentation/final-newline": "error",
    },
  },
];

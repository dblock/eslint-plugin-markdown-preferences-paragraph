import js from "@eslint/js";
import markdown from "@eslint/markdown";

export default [
  {
    ignores: ["coverage/**", "test/fixtures/**"],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: { URL: "readonly" },
    },
  },
  {
    files: ["*.md"],
    plugins: { markdown },
    processor: "markdown/markdown",
  },
  {
    files: ["**/*.md/*.js"],
    rules: {
      "no-unused-vars": "off",
    },
  },
];

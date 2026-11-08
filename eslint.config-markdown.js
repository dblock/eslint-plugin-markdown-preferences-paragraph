import markdown from "@eslint/markdown";

export default [
  {
    files: ["*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    rules: markdown.configs.recommended[0].rules,
  },
];

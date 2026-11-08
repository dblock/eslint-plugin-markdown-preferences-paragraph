export function configuration(fixture, { markdown, preferences, plugin }) {
  const namespace = "paragraph";
  const extended = fixture.language === "extended-syntax";
  const nonParagraph = {
    paragraph: "ignore",
    heading: 80,
    table: 120,
    html: 120,
    code: "ignore",
    frontmatter: "ignore",
    math: "ignore",
  };
  return {
    files: ["**/*.md", "**/*.markdown"],
    plugins: {
      markdown,
      [namespace]: plugin,
      ...(extended || fixture.coexistence ? { "markdown-preferences": preferences } : {}),
    },
    language: extended
      ? "markdown-preferences/extended-syntax"
      : `markdown/${fixture.language}`,
    languageOptions: fixture.languageOptions ?? {},
    rules: {
      [`${namespace}/paragraph-wrap`]: [
        fixture.severity ?? "error",
        ...(fixture.options === undefined ? [] : [fixture.options]),
      ],
      ...(fixture.coexistence ? {
        "markdown-preferences/max-len": ["error", {
          ...nonParagraph,
          list: { ...nonParagraph },
          blockquote: { ...nonParagraph },
          footnoteDefinition: { ...nonParagraph },
        }],
      } : {}),
    },
  };
}

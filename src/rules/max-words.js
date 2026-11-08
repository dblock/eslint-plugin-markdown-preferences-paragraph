const segmenter = new Intl.Segmenter("en", { granularity: "word" });

function prose(node) {
  if (node.type === "text") return node.value;
  if (node.type === "html") return /^<br(?:\s|\/?>)/iu.test(node.value) ? " " : "";
  return node.children ? node.children.map(prose).join("") : " ";
}

export default {
  meta: {
    type: "suggestion",
    languages: ["markdown/*", "markdown-preferences/*"],
    docs: {
      description: "Limit the number of words in Markdown paragraphs.",
      url: "https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph#paragraph-word-limits",
    },
    schema: [{
      type: "object",
      properties: {
        max: { type: "integer", minimum: 1 },
      },
      additionalProperties: false,
    }],
    messages: {
      maxWords: "Paragraph has {{actual}} words; maximum is {{max}}.",
    },
  },
  create(context) {
    const max = context.options[0]?.max;
    if (max === undefined) return {};
    return {
      paragraph(node) {
        let actual = 0;
        for (const { isWordLike } of segmenter.segment(prose(node))) {
          if (isWordLike) actual++;
        }
        if (actual > max) {
          context.report({
            node,
            messageId: "maxWords",
            data: { actual: String(actual), max: String(max) },
          });
        }
      },
    };
  },
};

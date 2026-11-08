const languages = ["markdown/*"];

export default {
  meta: { name: "documentation" },
  rules: {
    "first-heading": {
      meta: {
        type: "problem",
        languages,
        schema: [],
        messages: { firstHeading: "Start the document with a level-one heading." },
      },
      create(context) {
        return {
          root(node) {
            const first = node.children.find((child) =>
              child.type !== "html" ||
              !/^\s*(?:<!--[\s\S]*-->|<img\b[^>]*\/?>)\s*$/iu.test(child.value)
            );
            if (!first || (first.type === "heading" && first.depth === 1)) return;
            context.report({ node, loc: { line: 1, column: 1 }, messageId: "firstHeading" });
          },
        };
      },
    },
    "final-newline": {
      meta: {
        type: "layout",
        languages,
        schema: [],
        fixable: "whitespace",
        messages: { finalNewline: "End the document with a newline." },
      },
      create(context) {
        const source = context.sourceCode;
        return {
          root(node) {
            if (!source.text || source.text.endsWith("\n")) return;
            context.report({
              node,
              loc: source.getLocFromIndex(source.text.length),
              messageId: "finalNewline",
              fix: (fixer) => fixer.insertTextAfterRange([0, source.text.length], "\n"),
            });
          },
        };
      },
    },
  },
};

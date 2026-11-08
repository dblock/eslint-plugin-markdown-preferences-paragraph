import { fileURLToPath } from "node:url";
import { getDefaultBundledSettingsAsync, getDictionary, Text } from "cspell-lib";

const bundled = await getDefaultBundledSettingsAsync();
const settings = {
  ...bundled,
  dictionaries: ["en_us", "softwareTerms", "project"],
  dictionaryDefinitions: [
    ...bundled.dictionaryDefinitions,
    {
      name: "project",
      path: fileURLToPath(new URL("../.spellcheck.txt", import.meta.url)),
    },
  ],
};
const dictionary = await getDictionary(settings);
const errors = dictionary.getErrors();
if (errors.length) throw new AggregateError(errors, "Cannot load spelling dictionaries.");

const languages = ["markdown/*"];

export default {
  meta: { name: "documentation" },
  rules: {
    spelling: {
      meta: {
        type: "problem",
        languages,
        schema: [],
        messages: { unknownWord: 'Unknown word: "{{word}}".' },
      },
      create(context) {
        const source = context.sourceCode;
        return {
          text(node) {
            if (/^https?:\/\/\S+$/u.test(node.value)) return;
            const offset = node.position.start.offset;
            const text = source.text.slice(offset, node.position.end.offset);
            for (const candidate of Text.extractPossibleWordsFromTextOffset({ text, offset })) {
              if (dictionary.has(candidate.text, { ignoreCase: true })) continue;
              for (const word of Text.extractWordsFromCodeTextOffset(candidate)) {
                if (dictionary.has(word.text, { ignoreCase: true })) continue;
                context.report({
                  node,
                  loc: {
                    start: source.getLocFromIndex(word.offset),
                    end: source.getLocFromIndex(word.offset + word.text.length),
                  },
                  messageId: "unknownWord",
                  data: { word: word.text },
                });
              }
            }
          },
        };
      },
    },
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

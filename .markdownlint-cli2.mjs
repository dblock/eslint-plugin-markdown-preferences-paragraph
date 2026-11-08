import singleLineParagraphs from "markdownlint-rule-single-line-paragraphs";
import spellcheck from "markdownlint-rule-spellcheck";
import titleCaseStyle from "markdownlint-rule-title-case-style";

export default {
  customRules: [singleLineParagraphs, spellcheck, titleCaseStyle],
  config: {
    default: true,
    MD013: false,
    MD033: { allowed_elements: ["img"] },
    "single-line-paragraphs": { enabled: true },
    "title-case-style": {
      case: "title",
      ignore: ["ESLint", "JavaScript", "CommonMark", "GFM", "API", "URLs", "CI"],
    },
    spellcheck: {
      dictionaries: {
        en: [
          "@cspell/dict-en_us",
          "@cspell/dict-software-terms",
          "./.spellcheck.txt",
        ],
      },
    },
  },
};

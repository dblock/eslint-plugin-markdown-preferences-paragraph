# ESLint Plugin Markdown Preferences Paragraph Wrap

[![Test](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/actions/workflows/test.yml/badge.svg)](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/actions/workflows/test.yml) [![Lint](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/actions/workflows/lint.yml/badge.svg)](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/actions/workflows/lint.yml) [![Package](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/actions/workflows/package.yml/badge.svg)](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/actions/workflows/package.yml) [![Coverage](https://coveralls.io/repos/github/dblock/eslint-plugin-markdown-preferences-paragraph-wrap/badge.svg?branch=master)](https://coveralls.io/github/dblock/eslint-plugin-markdown-preferences-paragraph-wrap?branch=master)

An ESLint plugin for checking and safely fixing Markdown paragraph wrapping, inspired by [eslint-plugin-markdown-preferences#338](https://github.com/ota-meshi/eslint-plugin-markdown-preferences/issues/338).

**Status:** First implementation; not published to npm yet.

## Installation

Run `npm pack` from this checkout, then install the resulting tarball in your consuming project until an npm release is published:

```sh
npm install --save-dev eslint @eslint/markdown /path/to/eslint-plugin-markdown-preferences-paragraph-wrap-0.1.0.tgz
```

Requires Node.js 22.13 or a supported newer version, ESLint 9.39 or 10.x, and `@eslint/markdown` 8.x.

## Usage

In `eslint.config.js`:

```js
import markdown from "@eslint/markdown";
import paragraphWrap from "eslint-plugin-markdown-preferences-paragraph-wrap";

export default [{
  files: ["**/*.md", "**/*.markdown"],
  plugins: { markdown, "markdown-preferences-paragraph-wrap": paragraphWrap },
  language: "markdown/gfm",
  rules: {
    "markdown-preferences-paragraph-wrap/paragraph-wrap": ["error", { width: "nowrap" }],
  },
}];
```

Check with `npx eslint "**/*.md" "**/*.markdown"`; add `--fix` to safely join soft-wrapped paragraphs, including paragraphs in lists, blockquotes, and GFM footnotes. Intentional Markdown hard breaks and line-boundary `<br>` tags remain separate.

## Configuration

The only option is `width`: a positive integer wraps overlong source lines, `"nowrap"` joins soft line breaks without a width limit, and `"ignore"` skips paragraph checks. Omitting `width` also skips checks and leaves paragraphs untouched. One policy applies to every paragraph; there are no container overrides, URL exemptions, or recommended presets.

Numeric widths include source markup and container prefixes, Unicode display width, and four-column tab stops. Safe paragraph segments reflow to the configured width, even if their existing lines already fit: changing `width` from `30` to `80` and running `--fix` fills the wider lines. Already canonical wrapping stays untouched, and intentional hard breaks remain separate. URLs and indivisible inline constructs are never split; unsafe or impossible corrections to overlong lines report without a fix. See [Fix Safety](DESIGN.md#integration-and-implementation) for conservative limitations.

If you also use `markdown-preferences/max-len`, explicitly ignore its paragraph checks at the root and in containers as shown in [Coexistence](DESIGN.md#coexistence-with-existing-length-rules). Disable markdownlint `MD013` when enforcing unrestricted `"nowrap"`.

## Contributing

Read [Contributing](CONTRIBUTING.md), [Design](DESIGN.md), [Changelog](CHANGELOG.md), [Releasing](RELEASING.md), and [Automated Contributor Instructions](AGENTS.md).

## License

[MIT](LICENSE).

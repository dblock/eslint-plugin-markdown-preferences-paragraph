<img src="assets/logo.svg" alt="Pale blue notepad with a thin border and a paragraph-wrap arrow" width="160">

# ESLint Plugin Markdown Preferences Paragraph

[![Test](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/workflows/test.yml/badge.svg)](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/workflows/test.yml) [![Lint](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/workflows/lint.yml/badge.svg)](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/workflows/lint.yml) [![Package](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/workflows/package.yml/badge.svg)](https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph/actions/workflows/package.yml) [![Coverage](https://coveralls.io/repos/github/dblock/eslint-plugin-markdown-preferences-paragraph/badge.svg?branch=master)](https://coveralls.io/github/dblock/eslint-plugin-markdown-preferences-paragraph?branch=master)

An ESLint plugin for checking Markdown paragraph wrapping and word counts, with conservative wrapping fixes, inspired by [eslint-plugin-markdown-preferences#338](https://github.com/ota-meshi/eslint-plugin-markdown-preferences/issues/338).

## Installation

```sh
npm install --save-dev eslint @eslint/markdown eslint-plugin-markdown-preferences-paragraph@0.2.0
```

Requires Node.js 22.13 or a supported newer version, ESLint 9.39 or 10.x, and `@eslint/markdown` 8.x.

## Usage

In `eslint.config.js`:

```js
import markdown from "@eslint/markdown";
import paragraph from "eslint-plugin-markdown-preferences-paragraph";

export default [{
  files: ["**/*.md"],
  plugins: { markdown, paragraph },
  language: "markdown/gfm",
  rules: {
    "paragraph/wrap": ["error", { width: 80 }],
  },
}];
```

Check Markdown paragraphs against an 80-column width:

```sh
npx eslint "**/*.md"
```

## Configuration

### `paragraph/wrap`

`paragraph/wrap` accepts `width` and an optional numeric wrapping `strategy`:

| Value | Behavior |
| --- | --- |
| Positive integer, such as `80` | Check paragraph width and safely reflow to that width. |
| `"nowrap"` | Check for soft line breaks and safely join them without a width limit. |
| `"ignore"` | Skip paragraph checks and fixes. |
| Omitted (default) | Skip paragraph checks and fixes. |

One width policy applies to every paragraph, including paragraphs in lists, blockquotes, and GFM footnotes. There are no container-specific widths, URL exemptions, or recommended presets.

Numeric widths include source markup and container prefixes, Unicode display width, and four-column tab stops.

The default `"greedy"` strategy fills each line before starting the next. Choose `"balanced"` to use the fewest possible lines and reduce uneven line lengths, including a short final line:

```json
{
  "paragraph/wrap": ["error", { "width": 80, "strategy": "balanced" }]
}
```

Both strategies preserve atomic constructs and hard breaks. `strategy` has no effect with omitted `width`, `"ignore"`, or `"nowrap"`. Very large balancing searches remain report-only rather than allowing unbounded linting work.

### `paragraph/max-words`

Set a positive integer `max` to report paragraphs exceeding that word count:

```json
{
  "paragraph/max-words": ["error", { "max": 200 }]
}
```

Omitting `max`, including an empty options object, does nothing. The limit applies to the whole paragraph in any supported container, independently of wrapping and hard breaks. Diagnostics include the actual count and maximum; this rule never fixes or suggests where to split prose.

Count prose and link labels with Unicode-aware English word segmentation. Numbers count as words; punctuation and emoji do not. Inline formatting and decoded entities contribute their text, not their markup. Markdown code, images, footnote markers, link destinations, and titles do not count. HTML tags do not count, and hard breaks separate words.

## Fixing

Apply safe paragraph fixes with ESLint:

```sh
npx eslint "**/*.md" --fix
```

Numeric widths reflow paragraphs to the configured width; `"nowrap"` joins soft line breaks. Intentional hard breaks remain separate, and words, URLs, and inline constructs are never split. Unsafe or impossible corrections report without a fix; see [Fix Safety](DESIGN.md#integration-and-implementation).

Safe paragraph segments reflow even if their existing lines already fit: changing `width` from `30` to `80` fills the wider lines when fixing. Already canonical wrapping stays untouched.

## Interoperability

### [`markdown-preferences`](https://github.com/ota-meshi/eslint-plugin-markdown-preferences)

With the plugin registered as `markdownPreferences`, configure `max-len` to skip paragraphs at the root and in containers. For example, retain an 80-column heading limit:

```json
{
  "markdownPreferences/max-len": ["error", {
    "heading": 80,
    "paragraph": "ignore",
    "list": { "paragraph": "ignore" },
    "blockquote": { "paragraph": "ignore" },
    "footnoteDefinition": { "paragraph": "ignore" }
  }]
}
```

### [`markdownlint`](https://github.com/DavidAnson/markdownlint)

Disable markdownlint `MD013` when enforcing unrestricted `"nowrap"`. In `.markdownlint.json`:

```json
{
  "MD013": false
}
```

## Contributing

Read [Contributing](CONTRIBUTING.md), [Design](DESIGN.md), [Changelog](CHANGELOG.md), [Releasing](RELEASING.md), and [Automated Contributor Instructions](AGENTS.md).

## License

[MIT](LICENSE).

# Design

## Purpose

`eslint-plugin-markdown-preferences-paragraph` checks Markdown paragraph wrapping and word counts, with conservative wrapping fixes. It is not a general formatter, replacement parser, or rendered-text layout tool.

## Public API

The ESM plugin exports `meta`, `rules.wrap`, and `rules["max-words"]`. Register it as `paragraph`; see [README](README.md) for installation and examples.

| Width | Behavior |
| --- | --- |
| Omitted or `"ignore"` | Leave paragraphs untouched. |
| `"nowrap"` | Join safe soft line breaks without a maximum length. |
| Positive integer | Reflow safe segments to that source width, including widening existing short lines. |

One width applies to every paragraph, including supported lists, blockquotes, and footnotes. Invalid widths, unknown options, container-specific settings, and URL exemptions are rejected. There is no automatically enabled preset.

Numeric wrapping defaults to `strategy: "greedy"`. Opt-in `"balanced"` uses dynamic programming over the same safe whitespace boundaries: first minimize line count, then the sum of squared unused columns, including the final line and source prefixes/suffixes. Equal scores favor a longer first line. Cache width changes for all four tab positions and stop after one million candidate lines, leaving excessive searches report-only. Strategy is ignored for nonnumeric widths.

`paragraph/max-words` accepts an explicit positive integer `max`; omission leaves paragraphs unchecked. Count prose and link labels using `Intl.Segmenter` with English word segmentation, including numbers but excluding punctuation, emoji, code, images, footnote markers, destinations, and titles. Formatting contributes its text; HTML tags are ignored and hard breaks separate words. Limits apply to whole paragraphs, independently of source wrapping. Report the count and maximum without fixes or suggestions.

Existing paragraph-length rules and formatters must use compatible policies. The plugin does not inspect or change their configuration.

## Behavior

Check paragraph AST nodes in CommonMark and GFM through `@eslint/markdown`. Leave non-paragraph blocks untouched; front matter and math require language options that recognize them.

Count source syntax, indentation, and container prefixes using Unicode display width and four-column tab stops. Keep words, URLs, links, images, inline code, and other indivisible constructs intact. An overlong atomic construct remains report-only rather than receiving an incomplete fix.

Preserve intentional two-space, backslash, and HTML hard breaks, inline spelling and literals, paragraph boundaries, container markers, line endings, and final-newline state. Process segments between hard breaks independently.

## Integration and Implementation

`src/index.js` exports the plugin; `src/rules/wrap.js` uses public Markdown AST children, original source text, and localized replacement ranges. Numeric mode reports overlong lines as `width` and safe reflow of otherwise compliant lines as `reflow`.

`src/rules/max-words.js` reads paragraph text through public AST children and reports at the paragraph's original location. Joining text through formatting preserves words split by markup; excluded code, images, and references form word boundaries.

ESLint does not expose the active Markdown dialect through the rule context. Find every public Markdown language whose parse matches the original AST, then require each proposed edit to preserve the normalized AST under all matching languages. Ignore positions and soft-break whitespace during comparison, but preserve literals, inline syntax, hard breaks, and block structure.

If no dialect matches, or safety cannot be established, report without fixing. Ambiguous indentation, multiline literals, directives, unmatched extensions, mixed line endings in an edited segment, and syntax-changing break points prevent fixes. Fixes must not overlap and must stabilize on the next pass. AST equivalence is not a guarantee that every renderer treats soft breaks identically.

## Data-Driven File Fixtures

Each directory under `test/fixtures/integration/` contains `case.json`, `input.md`, `expected.md`, and `diagnostics.json`. Metadata selects language, rule (`wrap` by default), options, and optional integration settings; expected files preserve exact bytes rather than deriving them from the implementation. Optional diagnostic messages verify word counts and limits.

Shared API and packaged CLI runners check diagnostics and exit status, run `--fix`, compare expected bytes, then run `--fix` again to verify stability. Report-only cases retain their original bytes and lint errors. Preserve intentional line endings through `.gitattributes` and keep invalid fixtures outside documentation linting.

The consumer suite inspects and installs the actual npm archive in a temporary project and imports its public exports, never the source checkout. `PACKAGE_ARCHIVE` selects the exact archive prepared for release, with `PARAGRAPH_WRAP_PACKAGE_ARCHIVE` retained as a fallback. Empty overrides mean fresh packing. See [Contributing](CONTRIBUTING.md) for commands and coverage expectations.

## Development Tooling

Development uses ESLint for JavaScript, embedded examples, and Markdown. `@eslint/markdown` handles structure and code blocks; `eslint-plugin-markdown-preferences` handles style and title case; this plugin enforces `width: "nowrap"`. Markdown-source and embedded-code checks use separate invocations.

`eslint-plugin-prose-spellcheck` checks visible prose with offline US English, software terminology, and `.spellcheck.txt` dictionaries resolved relative to the Markdown configuration. It preserves source offsets and supplies no spelling fixes. Local rules enforce the first level-one heading and final newline; a YAML-aware checker validates workflow display names.

Test, Lint, and Package workflows remain separate. Compatibility tests cover the public Node and ESLint requirements; spelling supports both ESLint majors but requires a newer Node runtime as documented in [Contributing](CONTRIBUTING.md). Coverage uses Coveralls.

## Release Automation

Only a manual dispatch requests publication. The exact development dependency and matching reusable workflow from `npm-package-release` manage release operations. `npr.config.js` selects `IntrideaChangelog`, updates the README Installation section to the released version, and runs existing packed-consumer fixtures against the retained archive.

Require artifact preservation before publication. Publish the tested archive, atomically push the release commit and tag, create the GitHub Release, then validate and push the next development patch before registry confirmation. Keep the README installation pin at the released version. Failures retain structured release state, the archive, and recovery Git bundles; never blindly republish, overwrite versions, delete release tags, or reset source changes. See [Releasing](RELEASING.md) for setup, authorization, and recovery.

## Logo

[`assets/logo.svg`](assets/logo.svg) is original GitHub Copilot artwork under the project's [MIT license](LICENSE), with no adapted third-party assets. The SVG is both the editable source and README display asset: a pale blue notepad with a returning wrap arrow on a transparent 256-by-256 canvas.

Keep the logo above the README title at 160 pixels, with descriptive alternative text. Edit the SVG directly and preserve its view box, accessible title and description, and transparent background. Inspect full-size and README-size rendering on light and dark backgrounds; keep previews outside the repository. Packed-consumer tests verify that the editable logo is included.

# Design

**Status:** Agreed first-version scope; scaffold only. The paragraph wrapping rule is not implemented or published. Research checked on November 8, 2026.

## Purpose

Create `eslint-plugin-markdown-preferences-paragraph-wrap`, an independent, opt-in ESLint plugin that checks and safely fixes Markdown paragraph wrapping. Support both positive numeric widths and `"nowrap"` in one `paragraph-wrap` rule, without becoming a general Markdown formatter.

[To Wrap or Not to Wrap in Markdown?](https://code.dblock.org/2021/06/07/to-wrap-or-not-to-wrap-in-markdown.html) motivates one source line per paragraph: arbitrary reflow can turn a small wording edit into changes across several lines. This is a source-format preference, not a guarantee that all Markdown renderers treat soft line breaks identically.

## Inventory

The article names four existing enforcement tools and an ESLint proposal. `MD013` is also relevant because the article explicitly disables it. Formatters are distinguished from lint rules below.

| Tool | Configuration and Default | Numeric Wrapping | Unwrapping | Implication |
| --- | --- | --- | --- | --- |
| [markdownlint-rule-single-line-paragraphs](https://github.com/dblock/markdownlint-rule-single-line-paragraphs) | Enable the custom `single-line-paragraphs` rule; no width setting. | Not supported. | Reports soft-wrapped paragraph segments and supplies coordinated joining/deletion fixes. | Strong precedent for narrow, paragraph-only enforcement, but not a combined wrap/unwrap API. |
| [markdownlint `MD013` / `line-length`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md013.md) | `line_length: 80`; headings, code blocks, and tables included by default; `strict` and `stern` default to `false`. | Reports overlong lines; documentation recommends splitting them. No automatic paragraph reflow. | Not supported. | A length constraint is not a wrapping preference. Disable `MD013` when using unrestricted single-line paragraphs; simply setting a huge limit is not unwrapping. |
| [RuboCop `Prose/MaxLength`](https://github.com/dblock/rubocop-prose/blob/main/docs/cops/prose/max_length.md) | Enabled by default; `Max: false` means unwrapping, not disabling. `IgnoreURLs: true`. | A positive `Max` wraps prose, including container prefixes in the character budget. | `Max: false` joins soft line breaks. | Closest existing lint-rule precedent for combining both modes. Its [structural line-length cop](https://github.com/dblock/rubocop-prose/blob/main/docs/cops/markdown/structural_line_length.md) separates non-paragraph limits. |
| [Prettier](https://prettier.io/docs/options#prose-wrap) | `proseWrap: "preserve"` by default; `printWidth: 80`. | `"always"` reflows prose toward `printWidth`, which is a formatting target rather than an absolute maximum. | `"never"` puts prose blocks on one source line. | Separates wrapping policy from width. `--check` enforces all Prettier formatting, not just paragraph wrapping; `"preserve"` does not unwrap existing text. |
| [mdformat](https://mdformat.readthedocs.io/en/stable/users/configuration_file.html) | `wrap = "keep"` by default; also accepts `"no"` or an integer. | An integer requests wrapping. | `"no"` requests unwrapping. | Direct precedent for a width-or-keyword setting. Check/write modes also apply other formatting choices; CommonMark is the default, with extensions needed for additional dialects. |
| [eslint-plugin-markdown-preferences `max-len`](https://ota-meshi.github.io/eslint-plugin-markdown-preferences/rules/max-len.html) | Paragraph default `120`; accepts numeric limits or `"ignore"`, with container overrides and `ignoreUrls: true`. | Reports overlong source lines; the current rule has no fixes. | Not supported in the current rule. | Existing paragraph ownership overlaps this plugin unless users explicitly disable those limits. |

### Syntax and Exemption Differences

The markdownlint custom rule covers root, list, and blockquote paragraphs. It permits hard breaks from two or more trailing spaces or an unescaped trailing backslash, plus line-boundary `<br>`, `<br/>`, and `<br />` tags. Its README excludes headings, code blocks, tables, HTML blocks, front matter, and definitions; it does not advertise footnote-definition paragraph coverage.

`Prose/MaxLength` supports Markdown and plain text, preserves nesting, inline syntax, and hard breaks including `<br>`, and can report without correcting indented paragraphs or unbreakable overlong tokens. Its URL exemption is documented as paragraph lines containing only one URL. In contrast, ESLint's existing `max-len` exempts a line containing a recognized URL anywhere when `ignoreUrls` is enabled. These are materially different policies, not interchangeable options.

`MD013` has its own long-token exceptions: normal mode permits lines with no whitespace beyond the limit, `strict` removes that exception, and `stern` permits unbreakable lines while reporting lines that could be split. Link/image definitions and standalone link/image lines have additional exemptions. These policies should not be silently imported into a new ESLint rule.

Prettier and mdformat are useful behavioral references, not implementation dependencies. Their broader formatting scope and default preservation modes differ from a focused ESLint diagnostic and fix.

## Upstream Direction

[Issue #338](https://github.com/ota-meshi/eslint-plugin-markdown-preferences/issues/338) initially proposed `single-line-paragraphs` without options. The [maintainer response](https://github.com/ota-meshi/eslint-plugin-markdown-preferences/issues/338#issuecomment-6646164240) instead favors `paragraph-wrap` owning both maximum paragraph width and unwrapping, using the term `"nowrap"` and eventually removing paragraph checking from `max-len`.

The [latest proposal](https://github.com/ota-meshi/eslint-plugin-markdown-preferences/issues/338#issuecomment-6665919201) presents two alternatives: introduce `paragraph-wrap` and migrate paragraph ownership, or extend `max-len` without deprecation. The issue remains open; neither alternative should be described as accepted or released. [PR #332](https://github.com/ota-meshi/eslint-plugin-markdown-preferences/pull/332) remains open and unmerged and contains earlier unwrapping work.

This project follows the separate `paragraph-wrap` direction but cannot deprecate, change, or disable another package's rule. It must document coexistence honestly. Any reuse of upstream code or fixtures requires reviewing their license and retaining applicable notices; this proposal does not assume a private upstream utility is a supported API.

## Proposed Public API

Keep the requested repository and npm package name `eslint-plugin-markdown-preferences-paragraph-wrap`, under GitHub owner `dblock`. Before scaffolding, the GitHub repository lookup returned `404`, and npm returned `E404` for the unscoped package name; these checks suggest availability but do not reserve the names or guarantee registry acceptance.

Export one ESM plugin object with `meta` and `rules["paragraph-wrap"]`. Use the conventional namespace `markdown-preferences-paragraph-wrap`; users may choose a shorter local alias. There is no standalone CLI, replacement parser, fork of the upstream plugin, or automatic activation of unrelated rules.

### Options

| Option | Accepted Values | Proposed Default |
| --- | --- | --- |
| `width` | Positive integer, `"nowrap"`, or `"ignore"` | `120`, following the latest upstream proposal and existing paragraph limit. |

Reject zero, negative or fractional widths, unsupported keywords, unknown properties, and incorrect types through the rule schema. `"ignore"` skips enforcement; ESLint severity `"off"` disables the entire rule.

Apply the same `width` to every paragraph, including paragraphs inside lists, blockquotes, and supported footnote definitions. The first version has no container-specific overrides or policy precedence. This deliberately simplifies the latest upstream proposal while retaining paragraph coverage in all supported containers.

There is no `ignoreUrls` option or URL-line exemption. Wrap surrounding prose at safe boundaries while keeping URLs intact. If an indivisible URL exceeds the configured width, report without fixing rather than splitting it or ignoring the entire line. URLs need no exception in `"nowrap"` mode.

Do not ship an opinionated recommended preset in the first version. Enable the rule explicitly, and set `width: "nowrap"` for the user's preferred single-line prose. The numeric default remains available for users who enable the rule without options.

### Example Configuration

This is a proposed consumer configuration, not working usage for an already implemented package:

```js
import markdown from "@eslint/markdown";
import paragraphWrap from "eslint-plugin-markdown-preferences-paragraph-wrap";

export default [
  {
    files: ["**/*.md", "**/*.markdown"],
    plugins: {
      markdown,
      "markdown-preferences-paragraph-wrap": paragraphWrap,
    },
    language: "markdown/gfm",
    rules: {
      "markdown-preferences-paragraph-wrap/paragraph-wrap": [
        "error",
        { width: "nowrap" },
      ],
    },
  },
];
```

For numeric wrapping, use `{ width: 120 }`. Container-specific settings and `ignoreUrls` are not supported in the first version.

### Coexistence With Existing Length Rules

When also using `markdown-preferences/max-len`, explicitly ignore paragraph limits at the root and in every supported container. Numeric container settings must be replaced with entity-specific objects so they cannot reintroduce paragraph limits:

```js
const nonParagraphLimits = {
  heading: 80,
  table: 120,
  html: 120,
  code: "ignore",
  frontmatter: "ignore",
  math: "ignore",
  paragraph: "ignore",
};

const maxLenOptions = {
  ...nonParagraphLimits,
  list: { ...nonParagraphLimits },
  blockquote: { ...nonParagraphLimits },
  footnoteDefinition: { ...nonParagraphLimits },
  ignoreUrls: true,
};

// Add this to an existing configuration that registers markdown-preferences.
export const rules = {
  "markdown-preferences/max-len": ["error", maxLenOptions],
};
```

Adapt existing non-paragraph limits rather than replacing deliberate project policies with these example values. With unrestricted `"nowrap"`, disable markdownlint `MD013`; align any formatter with the same wrapping policy. The plugin neither reads other rules' configuration nor guarantees conflict-free behavior under incompatible settings. A standalone companion cannot provide the maintainer's preferred exclusive ownership until upstream changes are released.

## First-Version Behavior

Check actual paragraph AST nodes at the document root and inside lists, blockquotes, and footnote definitions when the selected language parses them. Support CommonMark and GFM through `@eslint/markdown`, including task lists and GFM footnotes. Compatibility with `markdown-preferences/extended-syntax` is an optional integration, not a reason to create another parser.

In `"nowrap"` mode, report each soft-wrapped segment and join safe line boundaries with one space, without imposing any maximum length. Preserve existing intraline spacing and source spelling. A segment is the part of a paragraph between intentional hard-break boundaries.

In numeric mode, report lines whose source display width exceeds the configured limit. Reflow only affected, safely editable segments at safe whitespace boundaries; do not fill short lines or canonicalize already compliant paragraphs. Count indentation, quote/list/footnote prefixes, and inline Markdown syntax in the source width, not rendered text width. Match upstream's documented implementation convention: Unicode display width with four-column tab stops, while preserving original UTF-16 offsets for ESLint fixes.

Do not split words, URLs, link/image syntax, inline code, or other indivisible constructs to satisfy a width. URLs do not exempt surrounding prose from wrapping. If an atomic construct cannot fit, retain a diagnostic without an unsafe or endlessly repeated fix.

Preserve two-space and backslash hard breaks, and case-insensitive `<br>`, `<br/>`, and `<br />` at either side of a source-line boundary. Do not interpret an escaped tag or a tag inside inline code as HTML. Keep hard-break spelling and boundaries unchanged and process the remaining soft-wrapped segments independently.

Leave headings, tables, code blocks, HTML blocks, parsed front matter, link definitions, and math blocks alone. This promise depends on the selected parser recognizing those constructs: document the required front-matter/math language options, and do not claim unsupported dialect syntax is automatically protected.

Remove only proven continuation indentation and container prefixes when joining. Preserve first-line markers, task checkboxes, list numbering, blockquote nesting, paragraph boundaries, blank lines, and LF/CRLF style. New numeric-wrap lines must use valid continuation prefixes, never repeated list-item markers.

Report without fixing when safety cannot be established, including multiline literals, ambiguous indentation, directive boundaries, unknown extension syntax, mixed line endings in an edited segment, or a proposed line break that would create a heading, list, blockquote, thematic break, code block, or HTML block. No whole-document serialization or unrelated whitespace cleanup.

## Integration and Implementation

Use the host's paragraph AST, source ranges, ancestry, and original source text. Traverse public AST children if necessary rather than importing upstream internal helpers. Build one rule with small local helpers for width calculation, segmentation, prefix handling, and safe edits; avoid a generic formatting framework.

Use public language parse APIs to validate proposed edits against the selected dialect when practical. Compare document structure and inline meaning after normalizing only intended soft-break whitespace and discarding positions, while preserving literal values and hard-break nodes. Unknown syntax or unavailable validation must lead to conservative report-only behavior, not a fallback regex parser. Require fixture-based safety evidence as well; AST equivalence alone is not proof that every renderer behaves identically.

Fixes must be non-overlapping and stabilize on a subsequent ESLint pass. A segment that cannot be made compliant safely remains report-only. Use deterministic diagnostics and localized replacement ranges.

### Dependencies and Layout

Use JavaScript ESM, npm with a committed `package-lock.json`, and `node --test`. Proposed package layout: `src/index.js`, `src/rules/paragraph-wrap.js`, focused helpers only where needed, `test/`, and integration fixtures. Export the public plugin entry point and define an explicit packaged-file list.

Registry checks currently report ESLint `10.14.0`, `@eslint/markdown` `8.0.3`, `eslint-plugin-markdown-preferences` `0.43.0`, and `string-width` `8.3.0`; the Node distribution index reports Node `26.13.0` as the latest stable release and LTS. These are research observations, not permanent pins; recheck stable versions during scaffolding.

Use ESLint `^9.39.0 || ^10.0.0` and `@eslint/markdown ^8.0.0` as peer dependencies. Add `string-width` as a direct runtime dependency when implementing numeric wrapping; the scaffold has no runtime dependencies. Add `eslint-plugin-markdown-preferences` as a development dependency when implementing coexistence/extended-syntax integration tests; consumers need it only for those optional integrations. Supported Node versions start at `^22.13.0 || >=24.0.0`, matching the selected host's minimum on the supported Node 22 line rather than adding the older Node 20 line solely because upstream still allows it. Test the minimum supported Node version and the latest stable development runtime, plus both supported ESLint major versions. Use Node.js `26.13.0` for development; documentation spelling tools require at least Node.js 22.18.

The scaffold includes source and embedded-JavaScript linting with ESLint and `@eslint/markdown`, plus markdownlint prose, spelling, single-line-paragraph, and title-case checks. Markdown-source linting and code-block processor linting use separate ESLint invocations because applying the processor replaces the original Markdown input. A small tested YAML-aware checker enforces title case for workflow/job/step display names without checking machine identifiers or arbitrary `name` fields. Test, Lint, and Package workflows remain separate, with coverage and Coveralls.

## Acceptance Tests

| Area | Required Evidence |
| --- | --- |
| Modes and schema | Wrap/unwrap/ignore with the same width across root and nested paragraphs; invalid settings, including container-specific options and `ignoreUrls`, rejected; opt-in activation. |
| Containers | Ordered/unordered and task lists, nested quotes/lists, lazy continuations, loose paragraphs, and footnotes under a supporting language; markers and structure unchanged. |
| Breaks and inline syntax | Both Markdown hard-break forms; HTML breaks on either side of a boundary; escaped tags/backslashes; links, images, emphasis, inline code, Unicode, and literal content. |
| Numeric limits | Prefix-inclusive widths, tabs and wide/combining characters; prose wraps around intact URLs; overlong indivisible URLs and other constructs report without fixes; already compliant paragraphs unchanged; no partial-fix loops. |
| Conservative fixes | Multiline literals, directive boundaries, ambiguous indentation, unknown extensions, and syntax-changing split points produce diagnostics without unsafe edits. |
| Exclusions and stability | Non-paragraph blocks unchanged; configured front matter and math; LF/CRLF preservation; no fix overlap; a second fix pass makes no further changes. |
| Real integration | ESLint CLI check and `--fix` with CommonMark/GFM, optional extended syntax, inline disable comments, and actual `max-len` coexistence configuration. |
| Packaged consumer | Install the actual `npm pack` artifact in an owned temporary consumer; import public exports and run ESLint against fixtures without source-tree dependencies. |

### Data-Driven File Fixtures

Drive integration tests from checked-in fixture directories rather than Markdown strings embedded in test code. Each directory is one named case, discovered in sorted order by a shared `node --test` runner:

```text
test/fixtures/integration/
  nowrap-list/
    case.json
    input.md
    expected.md
    diagnostics.json
  numeric-url/
    case.json
    input.md
    expected.md
    diagnostics.json
```

`case.json` declares the language (`commonmark`, `gfm`, or optional `extended-syntax`), language options, rule options, and whether to enable the existing `max-len` coexistence configuration. Keep metadata declarative and validate it so misspelled fields cannot silently skip coverage. Run each case under its declared dialect; do not indiscriminately apply GFM fixtures to CommonMark.

`input.md` is the original file; `expected.md` is the exact file after fixing. For valid and report-only cases, expected output is identical to input. Check in expected bytes rather than deriving them from the implementation. `diagnostics.json` records expected diagnostics before and after fixing, using stable fields: rule ID, message ID, severity, location, and fix availability. Do not snapshot temporary absolute paths, raw fix ranges, or unrelated CLI metadata.

The runner installs the actual packed plugin in an owned temporary consumer and generates flat configuration from fixture metadata using public plugin exports. Reuse that installation across cases, but copy each input into an isolated case directory before invoking the real ESLint CLI. Never run `--fix` against checked-in fixtures or import the plugin from the source checkout in these tests. Use argument-array process invocation and capture output and exit status.

For every case, run a check with JSON output and compare diagnostics and the expected success/failure status. Then run `--fix`, compare the resulting Markdown byte-for-byte with `expected.md`, and compare remaining diagnostics. Finally run `--fix` again and assert unchanged bytes and diagnostics. Report-only cases may still exit with lint errors; that is expected, not a runner failure. Assert that check-only invocations leave files unchanged.

Start with fixtures covering root prose, ordered/unordered/task lists, nested quotes and lists, footnotes, hard-break segments, inline markup and literals, URL-adjacent prose and overlong URLs, numeric split points that would change parsing, ignored widths, excluded blocks, inline disable comments, and `max-len` coexistence. Add invalid-option cases with expected configuration failure and unchanged input, without depending on full ESLint error wording. Exercise Unicode and tabs in file fixtures, not only helper unit tests.

Include LF and CRLF cases and a missing-final-newline case. Preserve fixture bytes with narrowly targeted `.gitattributes` entries such as `-text` for CRLF and mixed-ending fixtures so Git checkout cannot invalidate the line-ending assertions. Mixed-ending edits that cannot be proven safe should remain report-only. Keep intentionally invalid fixtures out of project documentation linting without excluding normal documentation.

Use focused helper tests only for behavior that cannot be expressed clearly through file fixtures. New end-to-end behavior should normally require adding or updating a fixture, not adding a case-specific branch to the runner. Fixture failures must identify the case and phase and show a concise diagnostic or file diff.

## Scope and Review Gates

The first implementation includes numeric wrapping and `"nowrap"` together, one width policy for all paragraphs, safe fixes, documentation, and real host/package tests. Non-goals are container-specific policies, upstream deprecation work, a full Markdown formatter, semantic sentence wrapping, MDX or arbitrary renderer support, and automatic cross-rule conflict resolution.

The agreed first-version scope combines numeric wrapping and `"nowrap"`, with a default width of `120`, no container-specific options, and no URL exemptions. The implementation follows scaffold review and explicit approval.

The design and README-only bootstrap on `master` have been authorized. Create and validate the scaffold in a separate topic worktree and open its PR, then pause for explicit approval before implementing and opening a focused implementation PR. No merging, publication, release tags, or artwork is authorized.

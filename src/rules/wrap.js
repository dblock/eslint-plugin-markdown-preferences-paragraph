import markdown from "@eslint/markdown";
import stringWidth from "string-width";

const containers = new Set([
  "root", "list", "listItem", "blockquote", "footnoteDefinition",
]);
const literals = new Set([
  "inlineCode", "inlineMath", "html", "link", "image",
  "linkReference", "imageReference",
]);

function textWidth(text) {
  return text.split("\t").reduce(
    (width, part, index) =>
      width + (index ? 4 - (width % 4) : 0) + stringWidth(part),
    0,
  );
}

function sourceLines(text) {
  const lines = [];
  for (const match of text.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/gu)) {
    if (!match[0]) continue;
    lines.push({
      content: match[1],
      ending: match[2],
      start: match.index,
      end: match.index + match[1].length,
      number: lines.length + 1,
    });
  }
  return lines;
}

function visit(node, callback, ancestors = []) {
  callback(node, ancestors);
  for (const child of node.children ?? []) {
    visit(child, callback, [...ancestors, node]);
  }
}

function normalized(ast) {
  return JSON.stringify(ast, (key, value) => {
    if (key === "position") return undefined;
    if (value?.type === "text") {
      return {
        ...value,
        value: value.value.replace(/[ \t]*(?:\r\n|\r|\n)[ \t]*/gu, " "),
      };
    }
    return value;
  });
}

function verifier(sourceCode, languageOptions) {
  let languages;
  const original = normalized(sourceCode.ast);
  function parse(language, text) {
    const result = language.parse({ body: text }, { languageOptions });
    return result.ok ? normalized(result.ast) : null;
  }
  return (range, replacement) => {
    // Rule contexts do not expose the active language. Require every matching
    // public dialect to preserve the original AST, rather than guessing one.
    languages ??= Object.values(markdown.languages).filter(
      (language) => parse(language, sourceCode.text) === original,
    );
    const candidate =
      sourceCode.text.slice(0, range[0]) +
      replacement +
      sourceCode.text.slice(range[1]);
    return languages.length > 0 &&
      languages.every((language) => parse(language, candidate) === original);
  };
}

function continuationPrefix(prefix, ancestors) {
  if (prefix.includes("\t")) return null;
  let remaining = prefix;
  let result = "";
  let quotes = 0;
  while (remaining) {
    const match = remaining.match(
      /^( +|> ?|(?:[-+*]|\d{1,9}[.)]) +|\[\^[^\]\r\n]+\]: *|\[[ xX]\] +)/u,
    );
    if (!match) return null;
    const token = match[0];
    if (token.startsWith(">")) {
      quotes++;
      result += token;
    } else if (/^ +$/u.test(token)) {
      result += token;
    } else if (token.startsWith("[^")) {
      if (!ancestors.some((node) => node.type === "footnoteDefinition")) return null;
      result += "    ";
    } else if (token.startsWith("[")) {
      if (!ancestors.some((node) =>
        node.type === "listItem" && typeof node.checked === "boolean"
      )) return null;
    } else {
      if (!ancestors.some((node) => node.type === "listItem")) return null;
      result += " ".repeat(token.length);
    }
    remaining = remaining.slice(token.length);
  }
  return quotes === ancestors.filter((node) => node.type === "blockquote").length
    ? result
    : null;
}

function continuationStart(line, quotes) {
  let offset = 0;
  for (let index = 0; index < quotes; index++) {
    const match = line.slice(offset).match(/^[ \t]*> ?/u);
    if (!match) break;
    offset += match[0].length;
  }
  return offset + line.slice(offset).match(/^[ \t]*/u)[0].length;
}

function paragraphSegments(node, ancestors, lines, text) {
  const quotes = ancestors.filter((parent) => parent.type === "blockquote").length;
  const rows = lines
    .slice(node.position.start.line - 1, node.position.end.line)
    .map((line, index, selected) => {
      const start = index === 0
        ? node.position.start.offset
        : line.start + continuationStart(line.content, quotes);
      const end = index === selected.length - 1
        ? node.position.end.offset
        : line.end;
      return {
        ...line,
        bodyStart: start,
        bodyEnd: end,
        prefix: text.slice(line.start, start),
        body: text.slice(start, end),
      };
    });
  const boundaries = new Set();
  visit(node, (child) => {
    if (child.type === "break") {
      boundaries.add(child.position.start.line);
    }
    if (child.type === "html" && /^<br\s*\/?>$/iu.test(child.value)) {
      const row = rows.find((line) => line.number === child.position.start.line);
      if (!row) return;
      if (/^[ \t]*$/u.test(text.slice(child.position.end.offset, row.bodyEnd))) {
        boundaries.add(row.number);
      }
      if (/^[ \t]*$/u.test(text.slice(row.bodyStart, child.position.start.offset))) {
        boundaries.add(row.number - 1);
      }
    }
  });
  const segments = [];
  let segment = [];
  for (const row of rows) {
    segment.push(row);
    if (boundaries.has(row.number)) {
      segments.push(segment);
      segment = [];
    }
  }
  if (segment.length) segments.push(segment);
  return segments;
}

function joinSegment(rows, node) {
  const textNodes = node.children.filter((child) => child.type === "text");
  const atoms = node.children.filter((child) => child.type !== "text");
  let text = "";
  const gaps = [];
  for (const [index, row] of rows.entries()) {
    if (index > 0) {
      const boundary = rows[index - 1].end;
      if (!atoms.some((atom) =>
        atom.position.start.offset <= boundary &&
        atom.position.end.offset > boundary
      )) {
        gaps.push({ start: text.length, end: text.length + 1 });
      }
      text += " ";
    }
    const body = index < rows.length - 1
      ? row.body.replace(/[ \t]+$/u, "")
      : row.body;
    for (const match of body.matchAll(/[ \t]+/gu)) {
      const start = row.bodyStart + match.index;
      const end = start + match[0].length;
      const escaped = body.slice(0, match.index).match(/\\+$/u)?.[0].length ?? 0;
      if (escaped % 2 === 0 && textNodes.some((child) =>
        child.position.start.offset <= start && child.position.end.offset >= end
      )) {
        gaps.push({ start: text.length + match.index, end: text.length + match.index + match[0].length });
      }
    }
    text += body;
  }
  return {
    text,
    gaps: gaps.filter((gap) => gap.start > 0 && gap.end < text.length),
  };
}

function wrapSegment(joined, firstPrefix, nextPrefix, suffix, width, ending) {
  const { text, gaps } = joined;
  const output = [];
  let start = 0;
  let prefix = firstPrefix;
  let current = "";
  let separator = "";
  for (const gap of [...gaps, { start: text.length, end: text.length }]) {
    const token = text.slice(start, gap.start);
    if (current && textWidth(prefix + current + separator + token) > width) {
      if (textWidth(prefix + current) > width) return null;
      output.push(current);
      prefix = nextPrefix;
      current = token;
    } else {
      current += separator + token;
    }
    separator = text.slice(gap.start, gap.end);
    start = gap.end;
  }
  if (textWidth(prefix + current + suffix) > width) return null;
  output.push(current);
  return output.join(ending + nextPrefix);
}

function lineEnding(rows, lines) {
  const endings = new Set(rows.slice(0, -1).map((row) => row.ending));
  if (endings.size > 1) return null;
  if (endings.size === 1) return [...endings][0];
  if (rows[0].ending) return rows[0].ending;
  const fileEndings = new Set(lines.map((line) => line.ending).filter(Boolean));
  return fileEndings.size > 1 ? null : [...fileEndings][0] ?? "\n";
}

export default {
  meta: {
    type: "layout",
    languages: ["markdown/*", "markdown-preferences/*"],
    docs: {
      description: "Wrap or unwrap Markdown paragraphs without changing their structure.",
      url: "https://github.com/dblock/eslint-plugin-markdown-preferences-paragraph#configuration",
    },
    fixable: "whitespace",
    schema: [{
      type: "object",
      properties: {
        width: {
          oneOf: [
            { type: "integer", minimum: 1 },
            { enum: ["nowrap", "ignore"] },
          ],
        },
      },
      additionalProperties: false,
    }],
    messages: {
      nowrap: "Keep each soft-wrapped paragraph segment on one source line.",
      width: "Source line width {{actual}} exceeds the maximum of {{width}}.",
      reflow: "Reflow this paragraph segment to width {{width}}.",
    },
  },
  create(context) {
    const width = context.options[0]?.width ?? "ignore";
    const sourceCode = context.sourceCode;
    if (width === "ignore" || sourceCode.ast.type !== "root") return {};
    const lines = sourceLines(sourceCode.text);
    const parents = new WeakMap();
    visit(sourceCode.ast, (node, ancestors) => parents.set(node, ancestors));
    const verify = verifier(sourceCode, context.languageOptions);

    return {
      paragraph(node) {
        const ancestors = parents.get(node);
        const segments = paragraphSegments(node, ancestors, lines, sourceCode.text);
        const firstLine = lines[node.position.start.line - 1];
        const prefix = continuationPrefix(
          sourceCode.text.slice(firstLine.start, node.position.start.offset),
          ancestors,
        );
        let unsafe = prefix === null || ancestors.some((parent) => !containers.has(parent.type));
        const unsafeRanges = [];
        visit(node, (child) => {
          if (
            (literals.has(child.type) &&
              child.position.start.line !== child.position.end.line) ||
            (child.type === "html" && child.value.includes("<!--"))
          ) {
            unsafeRanges.push([child.position.start.offset, child.position.end.offset]);
          }
        });
        if (segments.flat().some((row) => /^(?::::|<<<)(?:\s|$)/u.test(row.body))) {
          unsafe = true;
        }

        for (const rows of segments) {
          const violations = width === "nowrap"
            ? (rows.length > 1 ? [rows[0]] : [])
            : rows.filter((row) => textWidth(row.content) > width);
          const reflow = violations.length === 0;
          if (width === "nowrap" && reflow) continue;
          const range = [rows[0].bodyStart, rows.at(-1).bodyEnd];
          const ending = lineEnding(rows, lines);
          let replacement = null;
          if (
            !unsafe && ending &&
            !rows.some((row) => row.prefix.includes("\t")) &&
            !unsafeRanges.some(([start, end]) => start < range[1] && end > range[0])
          ) {
            const joined = joinSegment(rows, node);
            replacement = width === "nowrap"
              ? joined.text
              : wrapSegment(
                joined,
                rows[0].prefix,
                prefix,
                sourceCode.text.slice(rows.at(-1).bodyEnd, rows.at(-1).end),
                width,
                ending,
              );
            if (replacement !== null && (
              replacement === sourceCode.text.slice(range[0], range[1]) ||
              !verify(range, replacement)
            )) replacement = null;
          }
          if (reflow) {
            if (replacement === null) continue;
            violations.push(rows[0]);
          }
          for (const [index, row] of violations.entries()) {
            context.report({
              node,
              loc: {
                start: {
                  line: row.number,
                  column: width === "nowrap" ? row.bodyStart - row.start + 1 : 1,
                },
                end: { line: row.number, column: row.content.length + 1 },
              },
              messageId: width === "nowrap" ? "nowrap" : reflow ? "reflow" : "width",
              data: { actual: String(textWidth(row.content)), width: String(width) },
              ...(index === 0 && replacement !== null ? {
                fix: (fixer) => fixer.replaceTextRange(range, replacement),
              } : {}),
            });
          }
        }
      },
    };
  },
};

import { createRequire } from "node:module";
import {
    slugifyPathSegment,
    stripFrontmatter,
    uniquifySlug,
} from "./docs-utils.mjs";
import { equationCitatorPathMapping } from "./site-config.mjs";

const require = createRequire(import.meta.url);
const MarkdownIt = require("markdown-it");
const katex = require("katex");
const { default: equationCitatorMarkdownIt } = await import("@friedparrot/equation-citator/markdown-it");

/**
 * Converts repository Markdown into site-ready Markdown before markdown-it
 * renders HTML. Asset and link resolution is delegated to the Equation Citator
 * markdown-it plugin through `env.markdownPath`, so this only keeps source
 * normalization that changes rendered output.
 */
export function transformMarkdownForSection(markdown) {
    const transformedMarkdown = stripFrontmatter(markdown).replaceAll('\r\n', "\n");
    return `${normalizeMarkdownMathBlockSpacing(transformedMarkdown)}\n`;
}

/**
 * Renders Markdown into HTML and collects heading anchors for the on-page TOC.
 * The visible docs page heading is supplied by the caller, normally from the
 * source filename, rather than inferred from the Markdown H1.
 */
export function renderMarkdownDocument(markdown, pageHeading, env = {}) {
    const headingIds = new Map();
    const tocItems = [];
    const markdownIt = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
    });
    markdownIt.use(markdownItKatexBlockPlugin);
    markdownIt.use(equationCitatorMarkdownIt, {
        enableObsidianCallouts: true,
        enableObsidianLinks: true,
        pathMapping: equationCitatorPathMapping,
    });

    markdownIt.renderer.rules.heading_open = (tokens, index) => {
        const inlineToken = tokens[index + 1];
        const headingText = inlineToken?.content ?? "";
        const baseSlug = slugifyPathSegment(headingText) || slugifyPathSegment(pageHeading);
        const headingId = uniquifySlug(baseSlug, headingIds);
        tokens[index].attrSet("id", headingId);

        const headingLevel = Number(tokens[index].tag.slice(1));
        tocItems.push({ level: headingLevel, text: headingText, id: headingId });
        return markdownIt.renderer.renderToken(tokens, index, markdownIt.options);
    };

    const contentHtml = markdownIt.render(markdown, env);
    return { contentHtml, tocItems, pageHeading };
}

function normalizeMarkdownMathBlockSpacing(markdown) {
    const normalizedLines = [];
    let inCodeBlocks = false;
    let inMathBlock = false;
    const lines = markdown.split("\n");

    for (const line of lines) {
        const isCodeBlockToggle  = /^\s*```/.test(line);
        if (isCodeBlockToggle) inCodeBlocks = !inCodeBlocks;
        if (isCodeBlockToggle || inCodeBlocks) {
            normalizedLines.push(line);
            continue;
        }

        const trimmedLine = line.trim();
        const startsMath = trimmedLine.startsWith("$$");
        const endsMath = trimmedLine.endsWith("$$");
        if (startsMath && normalizedLines.length > 0 && normalizedLines.at(-1)?.trim()) {
            normalizedLines.push("");
        }

        normalizedLines.push(line);

        if (startsMath && !endsMath) {
            inMathBlock = true;
            continue;
        }

        if ((inMathBlock && endsMath) || (startsMath && endsMath)) {
            normalizedLines.push("");
            inMathBlock = false;
        }
    }

    return normalizedLines.join("\n");
}

function renderDisplayMath(tex) {
    const renderedMath = katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: false,
    });

    return `<div class="ec-math-display">${renderedMath}</div>`;
}

function markdownItKatexBlockPlugin(markdownIt) {
    markdownIt.block.ruler.before("fence", "katex_block", (state, startLine, endLine, silent) => {
        const startPosition = state.bMarks[startLine] + state.tShift[startLine];
        const maxPosition = state.eMarks[startLine];
        const startLineText = state.src.slice(startPosition, maxPosition);
        const openingMatch = startLineText.match(mathBlockOpeningPattern());
        if (!openingMatch) {
            return false;
        }

        if (silent) {
            return true;
        }

        const mathLines = [];
        const firstLineRest = openingMatch[1];
        const singleLineEndIndex = firstLineRest.indexOf("$$");
        let nextLine = startLine + 1;

        if (singleLineEndIndex >= 0) {
            mathLines.push(firstLineRest.slice(0, singleLineEndIndex));
        } else {
            mathLines.push(firstLineRest);
            for (; nextLine < endLine; nextLine++) {
                const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
                const lineEnd = state.eMarks[nextLine];
                const lineText = state.src.slice(lineStart, lineEnd);
                const closingIndex = lineText.indexOf("$$");
                if (closingIndex >= 0) {
                    mathLines.push(lineText.slice(0, closingIndex));
                    nextLine++;
                    break;
                }

                mathLines.push(lineText);
            }
        }

        const token = state.push("math_block", "math", 0);
        token.block = true;
        token.content = mathLines.join("\n");
        token.map = [startLine, nextLine];
        state.line = nextLine;
        return true;
    });

    markdownIt.renderer.rules.math_block = (tokens, index) => renderDisplayMath(tokens[index].content);
}

function mathBlockOpeningPattern() {
    return new RegExp(String.raw`^\$\$\s*(.*)$`);
}

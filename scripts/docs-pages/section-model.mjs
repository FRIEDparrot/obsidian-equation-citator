import { promises as fs } from "node:fs";
import path from "node:path";
import {
    collectFiles,
    normalizePath,
    prettyTitleFromName,
    slugifyPathSegment,
    stripFrontmatter,
    stripHtmlTags,
} from "./docs-utils.mjs";

/**
 * Collects Markdown files for one section and treats README.md as optional
 * section intro content. Other Markdown files become navigable pages.
 */
export async function collectSectionContent({
    locale,
    sectionKey,
    sourceRoot,
    outputRoot,
    docsRoot,
    tutorialsSectionKey,
    changelogsSectionKey,
}) {
    const markdownFiles = await collectFiles(sourceRoot, {
        includeFile(filePath) {
            return path.extname(filePath).toLowerCase() === ".md";
        },
    });
    const introSourcePath = markdownFiles.find(filePath => normalizePath(path.relative(sourceRoot, filePath)).toLowerCase() === "readme.md");
    const pageFiles = markdownFiles.filter(filePath => filePath !== introSourcePath);
    const pageContext = { tutorialsSectionKey, changelogsSectionKey };
    const pages = [];

    for (const sourceFilePath of pageFiles) {
        pages.push(await buildPageInfo({
            sectionKey,
            sourceBasePath: sourceRoot,
            outputBasePath: outputRoot,
            sourceFilePath,
            docsRoot,
            pageContext,
        }));
    }
    pages.sort((leftPage, rightPage) => comparePages(leftPage, rightPage, pageContext));

    let introPageInfo = null;
    if (introSourcePath) {
        introPageInfo = await buildPageInfo({
            sectionKey,
            sourceBasePath: sourceRoot,
            outputBasePath: outputRoot,
            sourceFilePath: introSourcePath,
            docsRoot,
            forceIndex: true,
            pageContext,
        });
    }

    const pageLookup = buildPageLookup(introPageInfo ? [introPageInfo, ...pages] : pages);
    return { locale, sectionKey, sourceRoot, outputRoot, introPageInfo, pages, pageLookup };
}

export function buildPageLookup(pageInfos) {
    const pagesBySourcePath = new Map();
    const pagesByBaseName = new Map();

    for (const pageInfo of pageInfos) {
        pagesBySourcePath.set(normalizePath(pageInfo.sourcePath), pageInfo);

        const baseName = path.basename(pageInfo.sourcePath, ".md");
        if (!pagesByBaseName.has(baseName)) {
            pagesByBaseName.set(baseName, pageInfo);
        }
    }

    return { pagesBySourcePath, pagesByBaseName };
}

export function getMarkdownFileTitle(filePath) {
    const baseName = path.basename(filePath, ".md");
    return baseName.toLowerCase() === "readme" ?
        prettyTitleFromName(path.basename(path.dirname(filePath))) :
        prettyTitleFromName(baseName);
}

/**
 * Builds output path and navigation metadata for one Markdown source file.
 * Display titles intentionally come from filenames, while frontmatter only
 * supplies card metadata such as description and reading time.
 */
async function buildPageInfo({
    sectionKey,
    sourceBasePath,
    outputBasePath,
    sourceFilePath,
    docsRoot,
    pageContext,
    forceIndex = false,
}) {
    const relativeSourcePath = normalizePath(path.relative(sourceBasePath, sourceFilePath));
    const sourceMarkdown = await fs.readFile(sourceFilePath, "utf8");
    const title = getMarkdownFileTitle(sourceFilePath);
    const description = extractDocumentDescription(sourceMarkdown);
    const readingTimeLabel = estimateReadingTimeLabel(sourceMarkdown);
    const urlFromSectionRoot = forceIndex ? "index.html" : buildSectionOutputPath(sectionKey, relativeSourcePath, pageContext);
    const outputPath = path.join(outputBasePath, urlFromSectionRoot);
    const siteHref = normalizePath(path.relative(docsRoot, outputPath));

    return {
        sectionKey,
        sourcePath: sourceFilePath,
        relativeSourcePath,
        title,
        description,
        readingTimeLabel,
        siteHref,
        outputPath,
        isIntro: forceIndex,
    };
}

function comparePages(leftPage, rightPage, pageContext) {
    const leftRank = getPageOrderRank(leftPage, pageContext);
    const rightRank = getPageOrderRank(rightPage, pageContext);
    if (leftRank !== rightRank) {
        return leftRank - rightRank;
    }

    return leftPage.title.localeCompare(rightPage.title);
}

function getPageOrderRank(pageInfo, { tutorialsSectionKey }) {
    const relativePath = normalizePath(pageInfo.relativeSourcePath);
    if (pageInfo.sectionKey === tutorialsSectionKey) {
        const tutorialOrder = new Map([
            ["Quick Start.md", 0],
            ["Useful Tricks & techniques.md", 1],
            ["useful css snippets/README.md", 2],
        ]);
        return tutorialOrder.get(relativePath) ?? 100;
    }

    return 100;
}

function buildSectionOutputPath(sectionKey, relativeSourcePath, { tutorialsSectionKey, changelogsSectionKey }) {
    const normalizedPath = normalizePath(relativeSourcePath);
    if (sectionKey === tutorialsSectionKey) {
        if (normalizedPath === "Quick Start.md") return "quick-start.html";
        if (normalizedPath === "Useful Tricks & techniques.md") return "useful-tricks-techniques.html";
        if (normalizedPath === "useful css snippets/README.md") return "useful-css-snippets/index.html";
    }

    if (sectionKey === changelogsSectionKey) {
        if (normalizedPath === "CHANGELOG-1.3.x.md") return "series-1-3-x.html";
        if (normalizedPath === "CHANGELOG-1.2.x.md") return "series-1-2-x.html";
        if (normalizedPath === "CHANGELOG-1.0-1.1.md" || normalizedPath === "CHANGELOG-1.1.x.md") return "series-1-0-1-1.html";
    }

    const parsedPath = path.parse(normalizedPath);
    const directory = normalizePath(parsedPath.dir);
    const fileName = parsedPath.name.toLowerCase() === "readme" ?
        "index.html" :
        `${slugifyPathSegment(parsedPath.name)}.html`;
    return directory ? normalizePath(path.join(directory, fileName)) : fileName;
}

function extractDocumentDescription(markdown) {
    return parseFrontmatter(markdown).get("description") ?? "";
}

function estimateReadingTimeLabel(markdown) {
    const frontmatterTime = parseFrontmatter(markdown).get("time");
    if (frontmatterTime) {
        return frontmatterTime;
    }

    const text = stripHtmlTags(stripFrontmatter(markdown))
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
        .replace(markdownLinkPattern(), " ")
        .replace(/[#$*_`>|[\](){}\\]/g, " ");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 220));
    return `${minutes} min read`;
}

function markdownLinkPattern() {
    return new RegExp(String.raw`\[[^\]]+]\([^)]+\)`, "g");
}

function parseFrontmatter(markdown) {
    const normalizedMarkdown = markdown.replaceAll('\r\n', "\n");
    if (!normalizedMarkdown.startsWith("---\n")) {
        return new Map();
    }

    const endIndex = normalizedMarkdown.indexOf("\n---", 4);
    if (endIndex < 0) {
        return new Map();
    }

    const frontmatter = new Map();
    for (const line of normalizedMarkdown.slice(4, endIndex).split("\n")) {
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
        if (match) {
            frontmatter.set(match[1], match[2].replace(/^["']|["']$/g, "").trim());
        }
    }

    return frontmatter;
}

import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Application } from "typedoc";
import process from "node:process";
import {
    buildDocsPageHtml,
    buildOnPageTocHtml,
    buildSectionIndexContentHtml,
    buildSidebarHtml,
    buildToolbarLinksHtml,
} from "./docs-pages/page-shell.mjs";

const require = createRequire(import.meta.url);
const MarkdownIt = require("markdown-it");
const katex = require("katex");

const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = ["en", "zh-CN"];
const LOCALE_LABELS = new Map([
    ["en", "English"],
    ["zh-CN", "Chinese"],
]);

const repositoryRoot = process.cwd();
const docsPagesRoot = path.join(repositoryRoot, "scripts", "docs-pages");
const readmePath = path.join(repositoryRoot, "README.md");
const readmeZhPath = path.join(repositoryRoot, "README-zh-CN.md");
const docsRoot = path.join(repositoryRoot, "docs");
const docsApiRoot = path.join(docsRoot, "api");
const docsAssetsRoot = path.join(docsRoot, "assets");
const imageRoot = path.join(repositoryRoot, "img");

const defaultTutorialLocaleRoot = path.join(repositoryRoot, "tutorials", DEFAULT_LOCALE);
const legacyTutorialRoot = path.join(repositoryRoot, "tutorials");
const assetCopyCache = new Map();
const packageMetadata = JSON.parse(await fs.readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const siteTitle = `Equation Citator v${packageMetadata.version} Documentation`;

const sharedAssets = [
    { source: path.join(imageRoot, "logo-light.png"), target: "logo-light.png" },
    { source: path.join(imageRoot, "logo-dark.png"), target: "logo-dark.png" },
];

async function main() {
    await cleanDocsOutput();
    await writeSharedAssets();

    const localeNavigations = new Map();
    for (const locale of SUPPORTED_LOCALES) {
        localeNavigations.set(locale, await buildLocaleDocs(locale));
    }

    await writeRootRedirect();
    await buildTypeDocApi();
    await postProcessTypeDocPages(localeNavigations.get(DEFAULT_LOCALE));
    await writeApiLandingPage(localeNavigations.get(DEFAULT_LOCALE));
}

async function buildLocaleDocs(locale) {
    const localeDocsRoot = path.join(docsRoot, locale);
    const localeTutorialsRoot = path.join(localeDocsRoot, "tutorials");
    const localeChangelogsRoot = path.join(localeDocsRoot, "changelogs");
    const tutorialLocaleRoot = path.join(repositoryRoot, "tutorials", locale);
    const changelogLocaleRoot = path.join(repositoryRoot, "changelogs", locale);

    await assertDirectoryExists(tutorialLocaleRoot);
    await assertDirectoryExists(changelogLocaleRoot);

    const tutorialSection = await collectSectionContent({
        locale,
        sectionKey: "tutorials",
        sourceRoot: tutorialLocaleRoot,
        outputRoot: localeTutorialsRoot,
    });
    const changelogSection = await collectSectionContent({
        locale,
        sectionKey: "changelogs",
        sourceRoot: changelogLocaleRoot,
        outputRoot: localeChangelogsRoot,
    });

    const navigation = {
        locale,
        localeDocsRoot,
        localeTutorialsRoot,
        localeChangelogsRoot,
        tutorials: tutorialSection.pages,
        changelogs: changelogSection.pages,
    };

    await renderSectionPages(tutorialSection, navigation);
    await renderSectionPages(changelogSection, navigation);
    await writeSectionIndex(tutorialSection, navigation);
    await writeSectionIndex(changelogSection, navigation);
    await writeDocsLandingPage(navigation);

    return navigation;
}

async function assertDirectoryExists(directoryPath) {
    if (await pathExists(directoryPath)) {
        return;
    }
    throw new Error(`Missing documentation source directory: ${directoryPath}`);
}

async function cleanDocsOutput() {
    await fs.rm(docsRoot, { recursive: true, force: true });
    await fs.mkdir(docsRoot, { recursive: true });
}

async function writeSharedAssets() {
    await fs.mkdir(docsAssetsRoot, { recursive: true });

    for (const asset of sharedAssets) {
        await fs.copyFile(asset.source, path.join(docsAssetsRoot, asset.target));
    }

    const docsSiteCss = await fs.readFile(path.join(docsPagesRoot, "docs-site.css"), "utf8");
    await fs.writeFile(path.join(docsAssetsRoot, "docs-site.css"), docsSiteCss, "utf8");
    await fs.mkdir(path.join(docsAssetsRoot, "katex"), { recursive: true });
    await fs.copyFile(
        require.resolve("katex/dist/katex.min.css"),
        path.join(docsAssetsRoot, "katex", "katex.min.css")
    );
    await fs.cp(
        path.join(path.dirname(require.resolve("katex/dist/katex.min.css")), "fonts"),
        path.join(docsAssetsRoot, "katex", "fonts"),
        { recursive: true }
    );
}

async function collectSectionContent({ locale, sectionKey, sourceRoot, outputRoot }) {
    const markdownFiles = await collectMarkdownFiles(sourceRoot);
    const introSourcePath = markdownFiles.find(filePath => normalizePath(path.relative(sourceRoot, filePath)).toLowerCase() === "readme.md");
    const pageFiles = markdownFiles.filter(filePath => filePath !== introSourcePath);
    const pages = await buildPageInfos({
        sectionKey,
        sourceBasePath: sourceRoot,
        outputBasePath: outputRoot,
        pageFiles,
    });

    let introPageInfo = null;
    if (introSourcePath) {
        introPageInfo = await buildPageInfo({
            sectionKey,
            sourceBasePath: sourceRoot,
            outputBasePath: outputRoot,
            sourceFilePath: introSourcePath,
            forceIndex: true,
        });
    }

    const pageLookup = buildPageLookup(introPageInfo ? [introPageInfo, ...pages] : pages);
    return { locale, sectionKey, sourceRoot, outputRoot, introPageInfo, pages, pageLookup };
}

async function buildPageInfos({ sectionKey, sourceBasePath, outputBasePath, pageFiles }) {
    const pageInfos = [];

    for (const sourceFilePath of pageFiles) {
        pageInfos.push(await buildPageInfo({
            sectionKey,
            sourceBasePath,
            outputBasePath,
            sourceFilePath,
        }));
    }

    return pageInfos.sort((leftPage, rightPage) => comparePages(leftPage, rightPage));
}

async function buildPageInfo({
    sectionKey,
    sourceBasePath,
    outputBasePath,
    sourceFilePath,
    forceIndex = false,
}) {
    const relativeSourcePath = normalizePath(path.relative(sourceBasePath, sourceFilePath));
    const sourceMarkdown = await fs.readFile(sourceFilePath, "utf8");
    const title = extractDocumentTitle(sourceMarkdown, sourceFilePath);
    const description = extractDocumentDescription(sourceMarkdown);
    const readingTimeLabel = estimateReadingTimeLabel(sourceMarkdown);
    const urlFromSectionRoot = forceIndex ? "index.html" : buildSectionOutputPath(sectionKey, relativeSourcePath);
    const urlFromLocaleRoot = normalizePath(path.join(sectionKey, urlFromSectionRoot));

    return {
        sectionKey,
        sourcePath: sourceFilePath,
        relativeSourcePath,
        title,
        description,
        readingTimeLabel,
        urlFromLocaleRoot,
        outputPath: path.join(outputBasePath, urlFromSectionRoot),
        isIntro: forceIndex,
    };
}

function buildPageLookup(pageInfos) {
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

async function renderSectionPages(section, navigation) {
    for (const pageInfo of section.pages) {
        const sourceMarkdown = await fs.readFile(pageInfo.sourcePath, "utf8");
        const transformedMarkdown = await transformMarkdownForSection(sourceMarkdown, {
            pageInfo,
            pageLookup: section.pageLookup,
            sourceRoot: section.sourceRoot,
            outputRoot: section.outputRoot,
            locale: navigation.locale,
            isTutorial: pageInfo.sectionKey === "tutorials",
        });
        const renderedPage = renderMarkdownDocument(transformedMarkdown, pageInfo.title);
        const pageHtml = buildStandardDocsPage({
            pageTitle: pageInfo.title,
            pageHeading: renderedPage.pageHeading,
            pageContentHtml: stripLeadingHeading(renderedPage.contentHtml),
            currentSection: pageInfo.sectionKey,
            currentPageHref: pageInfo.urlFromLocaleRoot,
            navigation,
            tocItems: renderedPage.tocItems,
            outputFilePath: pageInfo.outputPath,
        });

        await writeFile(pageInfo.outputPath, pageHtml);
    }
}

async function buildSectionIntroHtml(section) {
    if (!section.introPageInfo) {
        return "";
    }

    const sourceMarkdown = await fs.readFile(section.introPageInfo.sourcePath, "utf8");
    const transformedMarkdown = await transformMarkdownForSection(sourceMarkdown, {
        pageInfo: section.introPageInfo,
        pageLookup: section.pageLookup,
        sourceRoot: section.sourceRoot,
        outputRoot: section.outputRoot,
        locale: section.locale,
        isTutorial: section.sectionKey === "tutorials",
    });
    const renderedPage = renderMarkdownDocument(transformedMarkdown, section.introPageInfo.title);
    return stripLeadingHeading(renderedPage.contentHtml);
}

async function transformMarkdownForSection(markdown, context) {
    let transformedMarkdown = markdown.replaceAll('\r\n', "\n");
    if (context.isTutorial) {
        transformedMarkdown = transformObsidianCallouts(transformedMarkdown);
    }

    const outputLines = [];
    let inFence = false;
    for (const line of transformedMarkdown.split("\n")) {
        if (/^\s*```/.test(line)) {
            inFence = !inFence;
            outputLines.push(line);
            continue;
        }

        outputLines.push(inFence ? line : await transformMarkdownLine(line, context));
    }

    return `${normalizeMarkdownMathBlockSpacing(outputLines.join("\n"))}\n`;
}

function normalizeMarkdownMathBlockSpacing(markdown) {
    const normalizedLines = [];
    let inFence = false;
    let inMathBlock = false;

    for (const line of markdown.split("\n")) {
        if (/^\s*```/.test(line) && !inMathBlock) {
            inFence = !inFence;
            normalizedLines.push(line);
            continue;
        }

        if (inFence) {
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

async function transformMarkdownLine(line, context) {
    const segments = line.split(/(`[^`]*`)/g);
    const outputSegments = [];

    for (const segment of segments) {
        if (segment.startsWith("`") && segment.endsWith("`")) {
            outputSegments.push(segment);
            continue;
        }

        outputSegments.push(await transformMarkdownTextSegment(segment, context));
    }

    return outputSegments.join("");
}

async function transformMarkdownTextSegment(segment, context) {
    let output = segment;

    output = await replaceAsync(
        output,
        /<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi,
        async (_match, beforeSrc, quote, src, afterSrc) => renderHtmlImage(beforeSrc, quote, src, afterSrc, context)
    );

    output = await replaceAsync(
        output,
        /!\[\[([^[\]]+)\]\]/g,
        async (_match, targetText) => renderWikiEmbed(targetText, context)
    );

    output = await replaceAsync(
        output,
        /\[\[([^[\]]+)\]\]/g,
        async (_match, targetText) => renderWikiLink(targetText, context)
    );

    output = await replaceAsync(
        output,
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        async (_match, altText, href) => renderMarkdownImage(altText, href, context)
    );

    output = await replaceAsync(
        output,
        /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
        async (_match, label, href) => renderMarkdownLink(label, href, context)
    );

    return output;
}

async function renderHtmlImage(beforeSrc, quote, src, afterSrc, context) {
    if (isExternalHref(src) || src.startsWith("data:") || src.startsWith("#")) {
        return `<img${beforeSrc}src=${quote}${src}${quote}${afterSrc}>`;
    }

    const assetHref = await resolveAssetHref(src, context, { fallbackImgDirectory: context.isTutorial });
    return `<img${beforeSrc}src=${quote}${assetHref}${quote}${afterSrc}>`;
}

function renderWikiLink(targetText, context) {
    const [rawTarget, rawAlias] = targetText.split("|");
    const target = rawTarget.trim();
    const label = rawAlias?.trim() ?? target;

    if (target.startsWith("#")) {
        const sectionTarget = target.slice(1).trim();
        return `[${escapeMarkdownLinkText(label)}](#${slugifyPathSegment(sectionTarget)})`;
    }

    const [documentTarget, sectionTarget = ""] = splitHashTarget(target);
    const href = resolvePageHref(documentTarget, sectionTarget, context, { allowBaseNameLookup: true });
    return `[${escapeMarkdownLinkText(label)}](${formatMarkdownHref(href)})`;
}

async function renderWikiEmbed(targetText, context) {
    const parts = targetText.split("|");
    const target = parts[0].trim();
    const width = parts.find(part => /^\d+$/.test(part.trim()))?.trim();

    if (target.startsWith("#")) {
        const sectionTarget = target.slice(1).trim();
        return `[Section preview: ${sectionTarget}](#${slugifyPathSegment(sectionTarget)})`;
    }

    const assetHref = await resolveAssetHref(target, context, { fallbackImgDirectory: true });
    const altText = path.basename(target, path.extname(target));
    const widthAttribute = width ? ` width="${escapeHtml(width)}"` : "";
    return `<img src="${assetHref}" alt="${escapeHtml(altText)}"${widthAttribute}>`;
}

async function renderMarkdownImage(altText, href, context) {
    if (isExternalHref(href)) {
        return `![${altText}](${href})`;
    }

    const assetHref = await resolveAssetHref(href, context, { fallbackImgDirectory: context.isTutorial });
    const normalizedAltText = extractImageAltText(altText, href);
    return `![${escapeMarkdownLinkText(normalizedAltText)}](${formatMarkdownHref(assetHref)})`;
}

async function renderMarkdownLink(label, href, context) {
    if (isExternalHref(href) || href.startsWith("#")) {
        return `[${escapeMarkdownLinkText(label)}](${href})`;
    }

    const [documentTarget, sectionTarget = ""] = splitHashTarget(href);
    const extension = path.extname(documentTarget).toLowerCase();
    if (extension === ".md") {
        const resolvedHref = resolvePageHref(documentTarget, sectionTarget, context, { allowBaseNameLookup: false });
        return `[${escapeMarkdownLinkText(label)}](${formatMarkdownHref(resolvedHref)})`;
    }

    const resolvedHref = await resolveAssetHref(documentTarget, context, { fallbackImgDirectory: context.isTutorial });
    const hashSuffix = sectionTarget ? `#${sectionTarget}` : "";
    return `[${escapeMarkdownLinkText(label)}](${formatMarkdownHref(`${resolvedHref}${hashSuffix}`)})`;
}

function resolvePageHref(documentTarget, sectionTarget, context, { allowBaseNameLookup }) {
    const targetPath = decodePathTarget(documentTarget.replaceAll("\\", "/"));
    const normalizedTargetPath = targetPath.endsWith(".md") ? targetPath : `${targetPath}.md`;
    const absoluteCandidatePath = normalizePath(path.resolve(path.dirname(context.pageInfo.sourcePath), normalizedTargetPath));

    let targetPage = context.pageLookup.pagesBySourcePath.get(absoluteCandidatePath);
    if (!targetPage && allowBaseNameLookup) {
        targetPage = context.pageLookup.pagesByBaseName.get(path.basename(normalizedTargetPath, ".md"));
    }

    if (!targetPage) {
        return documentTarget;
    }

    const relativeHref = normalizePath(path.relative(path.dirname(context.pageInfo.outputPath), targetPage.outputPath));
    if (!sectionTarget) {
        return relativeHref;
    }

    return `${relativeHref}#${slugifyPathSegment(sectionTarget)}`;
}

async function resolveAssetHref(assetTarget, context, { fallbackImgDirectory }) {
    const sourceAssetPath = await findSourceAssetPath(assetTarget, context, { fallbackImgDirectory });
    if (!sourceAssetPath) {
        return assetTarget;
    }

    const outputAssetPath = await ensureAssetCopied(sourceAssetPath, context);
    return normalizePath(path.relative(path.dirname(context.pageInfo.outputPath), outputAssetPath));
}

async function findSourceAssetPath(assetTarget, context, { fallbackImgDirectory }) {
    const normalizedTarget = decodePathTarget(assetTarget.replaceAll("\\", "/"));
    const candidatePaths = [];
    const pageDirectory = path.dirname(context.pageInfo.sourcePath);

    candidatePaths.push(path.resolve(pageDirectory, normalizedTarget));
    if (fallbackImgDirectory) {
        candidatePaths.push(path.resolve(pageDirectory, "img", normalizedTarget));
    }

    if (context.pageInfo.sectionKey === "tutorials") {
        for (const tutorialRoot of getTutorialAssetRoots(context.locale)) {
            candidatePaths.push(path.resolve(tutorialRoot, normalizedTarget));
            if (fallbackImgDirectory) {
                candidatePaths.push(path.resolve(tutorialRoot, "img", normalizedTarget));
            }
        }
    } else {
        candidatePaths.push(path.resolve(context.sourceRoot, normalizedTarget));
    }

    for (const candidatePath of candidatePaths) {
        if (await pathExists(candidatePath)) {
            return candidatePath;
        }
    }

    return null;
}

function getTutorialAssetRoots(locale) {
    const roots = [
        path.join(repositoryRoot, "tutorials", locale),
        defaultTutorialLocaleRoot,
        legacyTutorialRoot,
    ];

    return Array.from(new Set(roots.map(rootPath => normalizePath(rootPath)))).map(rootPath => rootPath.replaceAll("/", path.sep));
}

async function ensureAssetCopied(sourceAssetPath, context) {
    const cacheKey = `${normalizePath(context.outputRoot)}::${normalizePath(sourceAssetPath)}`;
    const cachedPath = assetCopyCache.get(cacheKey);
    if (cachedPath) {
        return cachedPath;
    }

    const relativeAssetPath = getAssetOutputRelativePath(sourceAssetPath, context);
    const outputAssetPath = path.join(context.outputRoot, relativeAssetPath);

    await fs.mkdir(path.dirname(outputAssetPath), { recursive: true });
    await fs.copyFile(sourceAssetPath, outputAssetPath);

    assetCopyCache.set(cacheKey, outputAssetPath);
    return outputAssetPath;
}

function getAssetOutputRelativePath(sourceAssetPath, context) {
    if (context.pageInfo.sectionKey === "tutorials") {
        for (const tutorialRoot of getTutorialAssetRoots(context.locale)) {
            if (isPathInside(sourceAssetPath, tutorialRoot) || normalizePath(sourceAssetPath) === normalizePath(tutorialRoot)) {
                return normalizePath(path.relative(tutorialRoot, sourceAssetPath));
            }
        }
    }

    if (isPathInside(sourceAssetPath, context.sourceRoot) || normalizePath(sourceAssetPath) === normalizePath(context.sourceRoot)) {
        return normalizePath(path.relative(context.sourceRoot, sourceAssetPath));
    }

    return normalizePath(path.basename(sourceAssetPath));
}

function renderMarkdownDocument(markdown, fallbackTitle) {
    const headingIds = new Map();
    const tocItems = [];
    const markdownIt = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
    });
    markdownIt.use(markdownItKatexBlockPlugin);

    markdownIt.renderer.rules.heading_open = (tokens, index) => {
        const inlineToken = tokens[index + 1];
        const headingText = inlineToken?.content ?? "";
        const baseSlug = slugifyPathSegment(headingText) || slugifyPathSegment(fallbackTitle);
        const headingId = uniquifySlug(baseSlug, headingIds);
        tokens[index].attrSet("id", headingId);

        const headingLevel = Number(tokens[index].tag.slice(1));
        tocItems.push({ level: headingLevel, text: headingText, id: headingId });
        return markdownIt.renderer.renderToken(tokens, index, markdownIt.options);
    };

    const contentHtml = markdownIt.render(markdown);
    const pageHeading = tocItems.find(item => item.level === 1)?.text ?? fallbackTitle;
    return { contentHtml, tocItems, pageHeading };
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
        const openingMatch = startLineText.match(/^\$\$\s*(.*)$/);
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

        const token = state.push("katex_block", "", 0);
        token.block = true;
        token.content = mathLines.join("\n");
        token.map = [startLine, nextLine];
        state.line = nextLine;
        return true;
    });

    markdownIt.renderer.rules.katex_block = (tokens, index) => renderDisplayMath(tokens[index].content);
}

async function buildTypeDocApi() {
    const app = await Application.bootstrapWithPlugins({
        options: normalizePath(path.join(repositoryRoot, "typedoc.json")),
        plugin: ["typedoc-github-theme"],
    });
    const project = await app.convert();
    if (!project) {
        throw new Error("TypeDoc failed to convert the project.");
    }
    await app.generateDocs(project, docsApiRoot);
}

async function postProcessTypeDocPages(navigation) {
    const htmlFiles = await collectFiles(docsApiRoot, {
        includeFile(filePath) {
            return path.extname(filePath).toLowerCase() === ".html";
        },
    });

    for (const htmlFilePath of htmlFiles) {
        if (normalizePath(htmlFilePath) === normalizePath(path.join(docsApiRoot, "index.html"))) {
            continue;
        }

        let html = await fs.readFile(htmlFilePath, "utf8");
        const currentPageHref = normalizePath(path.relative(docsRoot, htmlFilePath));
        const currentPageLabel = stripHtmlTags(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "API Reference");
        const shellModel = buildShellModel({
            currentSection: "api",
            currentPageHref,
            outputFilePath: htmlFilePath,
            navigation,
            extraSidebarHtml: buildApiReferenceSectionHtml({ currentPageHref, currentPageLabel }),
        });

        html = html.replace(
            "</head>",
            `  <link rel="stylesheet" href="${shellModel.docsAssetsHref}/docs-site.css">\n</head>`
        );
        html = html.replace(
            /<body([^>]*)>/,
            (match, attributes) => `<body${attributes.includes("class=") ? attributes.replace(/class="([^"]*)"/, 'class="$1 ec-docs-page ec-typedoc-page"') : `${attributes} class="ec-docs-page ec-typedoc-page"`}>`
        );
        html = html.replace(
            /<a href="(?:\.\.\/)*index\.html" class="title">[\s\S]*?<\/a>/,
            `<a href="${shellModel.homeHref}" class="title ec-site-title">${escapeHtml(siteTitle)}</a>`
        );
        html = html.replace(
            /<div id="tsd-toolbar-links">[\s\S]*?<\/div>/,
            `<div id="tsd-toolbar-links">${buildToolbarLinksHtml(shellModel.toolbarLinks)}</div>`
        );
        html = html.replace(
            /<div class="site-menu">[\s\S]*?<\/nav><\/div>/,
            `<div class="site-menu">${buildSidebarHtml(shellModel.sidebar)}</div>`
        );

        await fs.writeFile(htmlFilePath, html, "utf8");
    }
}

async function writeApiLandingPage(navigation) {
    const outputFilePath = path.join(docsApiRoot, "index.html");
    const pageHtml = buildStandardDocsPage({
        pageTitle: "API Documentation",
        pageHeading: "API Documentation",
        pageContentHtml: [
            `<p class="ec-lead">${escapeHtml(getApiIntroCopy())}</p>`,
            '<div class="ec-card-grid">',
            '  <a class="ec-card" href="modules.html"><h2>Module Index</h2><p>Browse the generated API modules and symbols.</p></a>',
            '  <a class="ec-card" href="hierarchy.html"><h2>Type Hierarchy</h2><p>Inspect the generated class and interface hierarchy.</p></a>',
            "</div>",
        ].join(""),
        currentSection: "api",
        currentPageHref: "api/index.html",
        navigation,
        tocItems: [],
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

async function writeSectionIndex(section, navigation) {
    const outputFilePath = path.join(section.outputRoot, "index.html");
    const title = getSectionIndexTitle(section);
    const introHtml = await buildSectionIntroHtml(section);
    const pageHtml = buildStandardDocsPage({
        pageTitle: title,
        pageHeading: title,
        pageContentHtml: buildSectionIndexContentHtml({
            title,
            description: "",
            introHtml,
            cards: buildSectionCards(section.pages, outputFilePath),
        }),
        currentSection: section.sectionKey,
        currentPageHref: `${section.sectionKey}/index.html`,
        navigation,
        tocItems: [],
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

function getSectionIndexTitle(section) {
    return section.introPageInfo?.title ?? prettyTitleFromName(section.sectionKey);
}

async function writeDocsLandingPage(navigation) {
    const outputFilePath = path.join(navigation.localeDocsRoot, "index.html");
    const sourceFilePath = navigation.locale === DEFAULT_LOCALE ? readmePath : readmeZhPath;
    const sourceMarkdown = sanitizeLandingReadmeMarkdown(await fs.readFile(sourceFilePath, "utf8"));
    const transformedMarkdown = await transformMarkdownForSection(sourceMarkdown, {
        pageInfo: {
            sectionKey: "home",
            sourcePath: sourceFilePath,
            outputPath: outputFilePath,
        },
        pageLookup: buildPageLookup([]),
        sourceRoot: repositoryRoot,
        outputRoot: navigation.localeDocsRoot,
        locale: navigation.locale,
        isTutorial: false,
    });
    const renderedPage = renderMarkdownDocument(transformedMarkdown, siteTitle);
    const pageHtml = buildStandardDocsPage({
        pageTitle: siteTitle,
        pageHeading: siteTitle,
        showPageHeading: false,
        pageContentHtml: renderedPage.contentHtml,
        currentSection: "home",
        currentPageHref: "index.html",
        navigation,
        tocItems: renderedPage.tocItems,
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

async function writeRootRedirect() {
    const outputFilePath = path.join(docsRoot, "index.html");
    const pageHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=en/index.html"><link rel="canonical" href="en/index.html"><title>Equation Citator Documentation</title></head><body><p><a href="en/index.html">Open Equation Citator documentation</a></p></body></html>';
    await writeFile(outputFilePath, pageHtml);
}

function buildStandardDocsPage({
    pageTitle,
    pageHeading,
    pageContentHtml,
    currentSection,
    currentPageHref,
    navigation,
    tocItems,
    outputFilePath,
    showPageHeading = true,
}) {
    const shellModel = buildShellModel({
        currentSection,
        currentPageHref,
        outputFilePath,
        navigation,
    });

    return buildDocsPageHtml({
        htmlLang: getHtmlLang(navigation.locale),
        typedocBaseHref: shellModel.typedocBaseHref,
        documentTitle: pageTitle === siteTitle ? siteTitle : `${pageTitle} | ${siteTitle}`,
        siteTitle,
        titleHref: shellModel.homeHref,
        toolbarLinksHtml: buildToolbarLinksHtml(shellModel.toolbarLinks),
        sidebarHtml: buildSidebarHtml(shellModel.sidebar),
        pageHeading,
        showPageHeading,
        pageContentHtml,
        tocHtml: buildOnPageTocHtml(tocItems),
        typedocAssetsHref: shellModel.typedocAssetsHref,
        docsAssetsHref: shellModel.docsAssetsHref,
    });
}

function buildSectionCards(pages, outputFilePath) {
    return pages.map(page => ({
        href: normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath)),
        title: page.title,
        description: page.description,
        readingTimeLabel: page.readingTimeLabel,
    }));
}

function buildLanguageOptions({ currentLocale, currentPageHref, outputFilePath }) {
    return SUPPORTED_LOCALES.map(locale => {
        const targetPath = getLocaleSwitchTargetPath(locale, currentPageHref);
        return {
            href: normalizePath(path.relative(path.dirname(outputFilePath), targetPath)),
            label: LOCALE_LABELS.get(locale) ?? locale,
            isActive: locale === currentLocale,
        };
    });
}

function getLocaleSwitchTargetPath(locale, currentPageHref) {
    const normalizedHref = normalizePath(currentPageHref);
    if (normalizedHref === "index.html") {
        return path.join(docsRoot, locale, "index.html");
    }

    if (normalizedHref.startsWith("tutorials/")) {
        return path.join(docsRoot, locale, normalizedHref);
    }

    if (normalizedHref === "changelogs/index.html") {
        return path.join(docsRoot, locale, normalizedHref);
    }

    if (normalizedHref.startsWith("changelogs/")) {
        return path.join(docsRoot, locale, "changelogs", "index.html");
    }

    return path.join(docsRoot, locale, "index.html");
}

function buildShellModel({ currentSection, currentPageHref, outputFilePath, navigation, extraSidebarHtml = "" }) {
    const homeHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(navigation.localeDocsRoot, "index.html")));
    const tutorialsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(navigation.localeTutorialsRoot, "index.html")));
    const changelogsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(navigation.localeChangelogsRoot, "index.html")));
    const apiIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "index.html")));
    const modulesHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "modules.html")));
    const hierarchyHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "hierarchy.html")));
    const docsAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), docsAssetsRoot));
    const typedocAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "assets")));
    const typedocBaseHref = ensureTrailingSlash(normalizePath(path.relative(path.dirname(outputFilePath), docsApiRoot))) || "./";
    const normalizedCurrentHref = normalizePath(currentPageHref);

    const tutorialLinks = [
        {
            href: tutorialsIndexHref,
            label: "Tutorials overview",
            isActive: normalizedCurrentHref === "tutorials/index.html",
        },
        ...navigation.tutorials.map(page => ({
            href: normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath)),
            label: page.title,
            isActive: normalizedCurrentHref === normalizePath(page.urlFromLocaleRoot),
        })),
    ];
    const changelogLinks = [
        {
            href: changelogsIndexHref,
            label: "ChangeLogs overview",
            isActive: normalizedCurrentHref === "changelogs/index.html",
        },
        ...navigation.changelogs.map(page => ({
            href: normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath)),
            label: page.title,
            isActive: normalizedCurrentHref === normalizePath(page.urlFromLocaleRoot),
        })),
    ];
    const apiLinks = [
        {
            href: apiIndexHref,
            label: "API overview",
            isActive: normalizedCurrentHref === "api/index.html",
        },
        {
            href: modulesHref,
            label: "Module index",
            isActive: normalizedCurrentHref === "api/modules.html",
        },
        {
            href: hierarchyHref,
            label: "Type hierarchy",
            isActive: normalizedCurrentHref === "api/hierarchy.html",
        },
    ];

    const toolbarLinks = [
        { href: tutorialsIndexHref, label: "Tutorials", isActive: currentSection === "tutorials" },
        { href: apiIndexHref, label: "API", isActive: currentSection === "api" },
    ];
    if (changelogLinks.length > 0) {
        toolbarLinks.splice(1, 0, { href: changelogsIndexHref, label: "ChangeLogs", isActive: currentSection === "changelogs" });
    }

    const sidebarSections = [
        { title: "Tutorials", isActive: currentSection === "tutorials", links: tutorialLinks },
        { title: "API Documentation", isActive: normalizedCurrentHref.startsWith("api/"), links: apiLinks },
    ];
    if (changelogLinks.length > 0) {
        sidebarSections.splice(1, 0, { title: "ChangeLogs", isActive: currentSection === "changelogs", links: changelogLinks });
    }

    return {
        homeHref,
        docsAssetsHref,
        typedocAssetsHref,
        typedocBaseHref,
        toolbarLinks,
        sidebar: {
            homeHref,
            logoLightHref: `${docsAssetsHref}/logo-light.png`,
            logoDarkHref: `${docsAssetsHref}/logo-dark.png`,
            languageOptions: buildLanguageOptions({
                currentLocale: navigation.locale,
                currentPageHref: normalizedCurrentHref,
                outputFilePath,
            }),
            sections: sidebarSections,
            extraHtml: extraSidebarHtml,
        },
    };
}

function sanitizeLandingReadmeMarkdown(markdown) {
    return markdown.replace(/^<center>.*README(?:-zh-CN|_zh)?\.md.*<\/center>\s*$/m, "");
}

function buildApiReferenceSectionHtml({ currentPageHref, currentPageLabel }) {
    const currentPageFileHref = normalizePath(path.basename(currentPageHref));
    return [
        '<section class="ec-sidebar-group ec-sidebar-group-api-detail">',
        '  <div class="ec-sidebar-group-title">Generated reference</div>',
        `  <a class="ec-nav-link ec-nav-link-active" href="${currentPageFileHref}">${escapeHtml(currentPageLabel)}</a>`,
        '  <ul class="tsd-small-nested-navigation" id="tsd-nav-container"><li>Loading...</li></ul>',
        '</section>',
    ].join("");
}

function comparePages(leftPage, rightPage) {
    const leftRank = getPageOrderRank(leftPage);
    const rightRank = getPageOrderRank(rightPage);
    if (leftRank !== rightRank) {
        return leftRank - rightRank;
    }

    return leftPage.title.localeCompare(rightPage.title);
}

function getPageOrderRank(pageInfo) {
    const relativePath = normalizePath(pageInfo.relativeSourcePath);
    if (pageInfo.sectionKey === "tutorials") {
        const tutorialOrder = new Map([
            ["Quick Start.md", 0],
            ["Useful Tricks & techniques.md", 1],
            ["useful css snippets/README.md", 2],
        ]);
        return tutorialOrder.get(relativePath) ?? 100;
    }

    const changelogOrder = new Map([
        ["CHANGELOG-1.3.x.md", 0],
        ["CHANGELOG-1.2.x.md", 1],
        ["CHANGELOG-1.0-1.1.md", 2],
        ["CHANGELOG-1.1.x.md", 2],
    ]);
    return changelogOrder.get(relativePath) ?? 100;
}

function buildSectionOutputPath(sectionKey, relativeSourcePath) {
    const normalizedPath = normalizePath(relativeSourcePath);
    if (sectionKey === "tutorials") {
        if (normalizedPath === "Quick Start.md") return "quick-start.html";
        if (normalizedPath === "Useful Tricks & techniques.md") return "useful-tricks-techniques.html";
        if (normalizedPath === "useful css snippets/README.md") return "useful-css-snippets/index.html";
    }

    if (sectionKey === "changelogs") {
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

function extractDocumentTitle(markdown, sourceFilePath) {
    let inFence = false;
    for (const line of markdown.replaceAll('\r\n', "\n").split("\n")) {
        if (/^\s*```/.test(line)) {
            inFence = !inFence;
            continue;
        }

        if (inFence) {
            continue;
        }

        const headingMatch = line.match(/^#\s+(.+)$/);
        if (headingMatch) {
            return headingMatch[1].trim();
        }
    }

    const baseName = path.basename(sourceFilePath, ".md");
    return baseName.toLowerCase() === "readme" ?
        prettyTitleFromName(path.basename(path.dirname(sourceFilePath))) :
        prettyTitleFromName(baseName);
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
        .replace(/\[[^\]]+]\([^)]+\)/g, " ")
        .replace(/[#$*_`>|[\](){}\\]/g, " ");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 220));
    return `${minutes} min read`;
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

function stripFrontmatter(markdown) {
    const normalizedMarkdown = markdown.replaceAll('\r\n', "\n");
    if (!normalizedMarkdown.startsWith("---\n")) {
        return markdown;
    }

    const endIndex = normalizedMarkdown.indexOf("\n---", 4);
    if (endIndex < 0) {
        return markdown;
    }

    return normalizedMarkdown.slice(endIndex + "\n---".length);
}

function prettyTitleFromName(name) {
    return name
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function transformObsidianCallouts(markdown) {
    const lines = markdown.split("\n");
    return lines.map(line => {
        const match = line.match(/^>\s*\[!([^\]]+)\]\s*(.*)$/);
        if (!match) {
            return line;
        }

        const calloutType = match[1].trim();
        const calloutTitle = match[2].trim();
        if (calloutType.includes(":")) {
            return line;
        }

        const title = calloutTitle || prettyTitleFromName(calloutType);
        return `> **${title}**`;
    }).join("\n");
}

function splitHashTarget(target) {
    const hashIndex = target.indexOf("#");
    if (hashIndex < 0) {
        return [target, ""];
    }

    return [target.slice(0, hashIndex), target.slice(hashIndex + 1)];
}

function uniquifySlug(baseSlug, slugCounts) {
    const currentCount = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, currentCount + 1);
    return currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount + 1}`;
}

function slugifyPathSegment(text) {
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizePath(filePath) {
    return filePath.replaceAll("\\", "/");
}

function ensureTrailingSlash(filePath) {
    if (!filePath || filePath.endsWith("/")) {
        return filePath;
    }

    return `${filePath}/`;
}

function isExternalHref(href) {
    return /^https?:\/\//i.test(href);
}

function formatMarkdownHref(href) {
    return /\s/.test(href) ? `<${href}>` : href;
}

function decodePathTarget(target) {
    try {
        return decodeURIComponent(target);
    } catch {
        return target;
    }
}

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
}

function escapeMarkdownLinkText(text) {
    return text.replaceAll("[", String.raw`\[`).replaceAll("]", String.raw`\]`);
}

function stripHtmlTags(text) {
    return text.replace(/<[^>]+>/g, "").trim();
}

function stripLeadingHeading(contentHtml) {
    return contentHtml.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, "").trim();
}

function extractImageAltText(rawAltText, href) {
    const parts = rawAltText
        .split("|")
        .map(part => part.trim())
        .filter(Boolean)
        .filter(part => !/^(fig|title|desc):/i.test(part))
        .filter(part => !/^\d+$/.test(part));

    if (parts.length > 0) {
        return parts[0];
    }

    return path.basename(href, path.extname(href));
}

function getHtmlLang(locale) {
    return locale === "zh-CN" ? "zh-CN" : "en";
}

function getApiIntroCopy() {
    return "The API reference is generated from the source code and shares the same documentation shell as the tutorials and changelogs.";
}

function isPathInside(targetPath, rootPath) {
    const relativePath = path.relative(rootPath, targetPath);
    return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

async function writeFile(filePath, content) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
}

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function collectMarkdownFiles(rootDirectoryPath) {
    return collectFiles(rootDirectoryPath, {
        includeFile(filePath) {
            return path.extname(filePath).toLowerCase() === ".md";
        },
    });
}

async function collectFiles(rootDirectoryPath, { includeFile }) {
    const files = [];
    const entries = await fs.readdir(rootDirectoryPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(rootDirectoryPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(entryPath, { includeFile }));
            continue;
        }

        if (includeFile(entryPath)) {
            files.push(entryPath);
        }
    }

    return files;
}

async function replaceAsync(text, pattern, replacer) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length === 0) {
        return text;
    }

    let output = "";
    let lastIndex = 0;
    for (const match of matches) {
        const startIndex = match.index ?? 0;
        output += text.slice(lastIndex, startIndex);
        output += await replacer(...match);
        lastIndex = startIndex + match[0].length;
    }

    output += text.slice(lastIndex);
    return output;
}

await main();

import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Application } from "typedoc";

const require = createRequire(import.meta.url);
const MarkdownIt = require("markdown-it");

const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = new Set(["en", "zh-CN"]);
const currentLocale = resolveRequestedLocale(process.argv.slice(2));

const repositoryRoot = process.cwd();
const docsRoot = path.join(repositoryRoot, "docs");
const docsApiRoot = path.join(docsRoot, "api");
const docsTutorialsRoot = path.join(docsRoot, "tutorials");
const docsChangelogsRoot = path.join(docsRoot, "changelogs");
const docsAssetsRoot = path.join(docsRoot, "assets");
const imageRoot = path.join(repositoryRoot, "img");

const tutorialLocaleRoot = path.join(repositoryRoot, "tutorials", currentLocale);
const changelogLocaleRoot = path.join(repositoryRoot, "changelogs", currentLocale);
const defaultTutorialLocaleRoot = path.join(repositoryRoot, "tutorials", DEFAULT_LOCALE);
const legacyTutorialRoot = path.join(repositoryRoot, "tutorials");
const assetCopyCache = new Map();

const sharedAssets = [
    { source: path.join(imageRoot, "logo-light.png"), target: "logo-light.png" },
    { source: path.join(imageRoot, "logo-dark.png"), target: "logo-dark.png" },
];

async function main() {
    await assertDirectoryExists(tutorialLocaleRoot);
    await assertDirectoryExists(changelogLocaleRoot);

    await cleanDocsOutput();
    await writeSharedAssets();

    const tutorialSection = await collectSectionContent({
        sectionKey: "tutorials",
        sourceRoot: tutorialLocaleRoot,
        outputRoot: docsTutorialsRoot,
    });
    const changelogSection = await collectSectionContent({
        sectionKey: "changelogs",
        sourceRoot: changelogLocaleRoot,
        outputRoot: docsChangelogsRoot,
    });

    const navigation = {
        tutorials: tutorialSection.pages,
        changelogs: changelogSection.pages,
        locale: currentLocale,
    };

    await renderSectionPages(tutorialSection, navigation);
    await renderSectionPages(changelogSection, navigation);
    await writeTutorialIndex(tutorialSection, navigation);
    await writeChangelogIndex(changelogSection, navigation);
    await writeDocsLandingPage(navigation);

    await buildTypeDocApi();
    await postProcessTypeDocPages(navigation);
    await writeApiLandingPage(navigation);
}

async function assertDirectoryExists(directoryPath) {
    if (await pathExists(directoryPath)) {
        return;
    }

    throw new Error(`Missing documentation source directory: ${directoryPath}`);
}

async function cleanDocsOutput() {
    await fs.mkdir(docsRoot, { recursive: true });
    await Promise.all([
        fs.rm(docsApiRoot, { recursive: true, force: true }),
        fs.rm(docsTutorialsRoot, { recursive: true, force: true }),
        fs.rm(docsChangelogsRoot, { recursive: true, force: true }),
        fs.rm(docsAssetsRoot, { recursive: true, force: true }),
        fs.rm(path.join(docsRoot, "index.html"), { force: true }),
    ]);
}

async function writeSharedAssets() {
    await fs.mkdir(docsAssetsRoot, { recursive: true });

    for (const asset of sharedAssets) {
        await fs.copyFile(asset.source, path.join(docsAssetsRoot, asset.target));
    }

    await fs.writeFile(path.join(docsAssetsRoot, "docs-site.css"), buildSharedCss(), "utf8");
}

async function collectSectionContent({ sectionKey, sourceRoot, outputRoot }) {
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
    return { sectionKey, sourceRoot, outputRoot, introPageInfo, pages, pageLookup };
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
    const urlFromSectionRoot = forceIndex ? "index.html" : buildSectionOutputPath(sectionKey, relativeSourcePath);
    const urlFromDocsRoot = normalizePath(path.join(sectionKey, urlFromSectionRoot));

    return {
        sectionKey,
        sourcePath: sourceFilePath,
        relativeSourcePath,
        title,
        urlFromDocsRoot,
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
            locale: currentLocale,
            isTutorial: pageInfo.sectionKey === "tutorials",
        });
        const renderedPage = renderMarkdownDocument(transformedMarkdown, pageInfo.title);
        const pageHtml = buildCustomPageHtml({
            pageTitle: pageInfo.title,
            pageHeading: renderedPage.pageHeading,
            pageContentHtml: renderedPage.contentHtml,
            currentSection: pageInfo.sectionKey,
            currentPageHref: pageInfo.urlFromDocsRoot,
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
        locale: currentLocale,
        isTutorial: section.sectionKey === "tutorials",
    });
    const renderedPage = renderMarkdownDocument(transformedMarkdown, section.introPageInfo.title);
    return stripLeadingHeading(renderedPage.contentHtml);
}

async function transformMarkdownForSection(markdown, context) {
    let transformedMarkdown = markdown.replace(/\r\n/g, "\n");
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

    return `${outputLines.join("\n")}\n`;
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
        /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g,
        async (_match, label, href) => renderMarkdownLink(label, href, context)
    );

    return output;
}

function renderWikiLink(targetText, context) {
    const [rawTarget, rawAlias] = targetText.split("|");
    const target = rawTarget.trim();
    const label = rawAlias?.trim() ?? target;

    if (target.startsWith("#")) {
        const sectionTarget = target.slice(1).trim();
        return `[${escapeMarkdownLinkText(label)}](#${slugifyHeading(sectionTarget)})`;
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
        return `[Section preview: ${sectionTarget}](#${slugifyHeading(sectionTarget)})`;
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

    return `${relativeHref}#${slugifyHeading(sectionTarget)}`;
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
    const cacheKey = normalizePath(sourceAssetPath);
    const cachedPath = assetCopyCache.get(cacheKey);
    if (cachedPath) {
        return cachedPath;
    }

    const relativeAssetPath = getAssetOutputRelativePath(sourceAssetPath, context);
    const outputRoot = context.pageInfo.sectionKey === "tutorials" ? docsTutorialsRoot : docsChangelogsRoot;
    const outputAssetPath = path.join(outputRoot, relativeAssetPath);

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

    markdownIt.renderer.rules.heading_open = (tokens, index) => {
        const inlineToken = tokens[index + 1];
        const headingText = inlineToken?.content ?? "";
        const baseSlug = slugifyHeading(headingText) || slugifyHeading(fallbackTitle);
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

async function buildTypeDocApi() {
    const app = await Application.bootstrapWithPlugins({
        options: path.join(repositoryRoot, "typedoc.json"),
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
        const relativeAssetsHref = normalizePath(path.relative(path.dirname(htmlFilePath), docsAssetsRoot));
        const currentPageHref = normalizePath(path.relative(docsRoot, htmlFilePath));

        html = html.replace(
            "</head>",
            `  <link rel="stylesheet" href="${relativeAssetsHref}/docs-site.css">\n</head>`
        );
        html = html.replace(/<body([^>]*)>/, '<body$1 class="ec-typedoc-page">');
        html = html.replace(
            '<div class="site-menu"><nav class="tsd-navigation">',
            `<div class="site-menu"><nav class="tsd-navigation ec-api-nav">${buildApiSidebarNavigation({
                currentPageHref,
                outputFilePath: htmlFilePath,
                navigation,
            })}`
        );
        html = html.replace("</nav></div>", "</section></nav></div>");
        html = html.replace(
            /<div class="tsd-navigation settings">[\s\S]*?<\/div>/,
            ""
        );

        await fs.writeFile(htmlFilePath, html, "utf8");
    }
}

async function writeApiLandingPage(navigation) {
    const outputFilePath = path.join(docsApiRoot, "index.html");
    const pageHtml = buildCustomPageHtml({
        pageTitle: "API documentation",
        pageHeading: "API documentation",
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

async function writeTutorialIndex(section, navigation) {
    const outputFilePath = path.join(docsTutorialsRoot, "index.html");
    const introHtml = await buildSectionIntroHtml(section);
    const pageHtml = buildCustomPageHtml({
        pageTitle: "Tutorials",
        pageHeading: "Tutorials",
        pageContentHtml: buildSectionIndexContent({
            title: "Tutorials",
            description: "Practical guides for using Equation Citator in real notes and writing workflows.",
            introHtml,
            pages: section.pages,
            outputFilePath,
        }),
        currentSection: "tutorials",
        currentPageHref: "tutorials/index.html",
        navigation,
        tocItems: [],
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

async function writeChangelogIndex(section, navigation) {
    const outputFilePath = path.join(docsChangelogsRoot, "index.html");
    const introHtml = await buildSectionIntroHtml(section);
    const pageHtml = buildCustomPageHtml({
        pageTitle: "Changelogs",
        pageHeading: "ChangeLogs",
        pageContentHtml: buildSectionIndexContent({
            title: "ChangeLogs",
            description: "Version history for Equation Citator, grouped into the main release series.",
            introHtml,
            pages: section.pages,
            outputFilePath,
        }),
        currentSection: "changelogs",
        currentPageHref: "changelogs/index.html",
        navigation,
        tocItems: [],
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

async function writeDocsLandingPage(navigation) {
    const outputFilePath = path.join(docsRoot, "index.html");
    const localeCopy = currentLocale === DEFAULT_LOCALE ?
        "English is the default docs build, with tutorials, changelogs, and the generated API reference grouped together." :
        "This build is using the simplified Chinese documentation set where available, plus the shared API reference.";
    const pageHtml = buildCustomPageHtml({
        pageTitle: "Equation Citator docs",
        pageHeading: "Equation Citator docs",
        pageContentHtml: [
            `<p class="ec-lead">${escapeHtml(localeCopy)}</p>`,
            '<div class="ec-card-grid">',
            '  <a class="ec-card" href="tutorials/index.html"><h2>Tutorials</h2><p>Start with the practical guides and usage walkthroughs.</p></a>',
            '  <a class="ec-card" href="changelogs/index.html"><h2>ChangeLogs</h2><p>Track release history and changes by version series.</p></a>',
            '  <a class="ec-card" href="api/index.html"><h2>API Documentation</h2><p>Browse the generated source-level reference.</p></a>',
            "</div>",
        ].join(""),
        currentSection: "home",
        currentPageHref: "index.html",
        navigation,
        tocItems: [],
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

function buildSectionIndexContent({ title, description, introHtml, pages, outputFilePath }) {
    const introBlock = introHtml ?
        `<div class="ec-section-intro">${introHtml}</div>` :
        `<p class="ec-lead">${escapeHtml(description)}</p>`;
    const pageCards = pages.length === 0 ?
        '<div class="ec-empty-state">No pages are available in this section for the current locale yet.</div>' :
        [
            `<div class="ec-section-card-grid" aria-label="${escapeHtml(title)} pages">`,
            ...pages.map(page => {
                const href = normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath));
                return [
                    `  <a class="ec-section-card" href="${href}">`,
                    `    <span class="ec-section-card-kicker">${escapeHtml(getSectionCardKicker(page.sectionKey))}</span>`,
                    `    <h2>${escapeHtml(page.title)}</h2>`,
                    "    <p>Open this page</p>",
                    "  </a>",
                ].join("");
            }),
            "</div>",
        ].join("");

    return `${introBlock}${pageCards}`;
}

function buildCustomPageHtml({
    pageTitle,
    pageHeading,
    pageContentHtml,
    currentSection,
    currentPageHref,
    navigation,
    tocItems,
    outputFilePath,
}) {
    const relativeAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), docsAssetsRoot));
    const sidebarHtml = buildCustomSidebar({
        currentSection,
        currentPageHref,
        outputFilePath,
        navigation,
    });
    const tocHtml = buildOnPageToc(tocItems);

    return `<!DOCTYPE html>
<html lang="${escapeHtml(getHtmlLang(currentLocale))}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)} | Equation Citator</title>
  <link rel="stylesheet" href="${relativeAssetsHref}/docs-site.css">
</head>
<body class="ec-docs-page">
  <div class="ec-layout">
    <aside class="ec-sidebar">
      ${sidebarHtml}
    </aside>
    <main class="ec-main">
      <article class="ec-content">
        <h1>${escapeHtml(pageHeading)}</h1>
        ${pageContentHtml}
      </article>
      ${tocHtml}
    </main>
  </div>
</body>
</html>`;
}

function buildCustomSidebar({ currentSection, currentPageHref, outputFilePath, navigation }) {
    const homeHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsRoot, "index.html")));
    const tutorialsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsTutorialsRoot, "index.html")));
    const changelogsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsChangelogsRoot, "index.html")));
    const apiIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "index.html")));
    const modulesHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "modules.html")));
    const hierarchyHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "hierarchy.html")));
    const relativeAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), docsAssetsRoot));

    return [
        `<a class="ec-brand" href="${homeHref}">`,
        `  <picture class="ec-brand-mark">`,
        `    <source media="(prefers-color-scheme: dark)" srcset="${relativeAssetsHref}/logo-dark.png">`,
        `    <img src="${relativeAssetsHref}/logo-light.png" alt="Equation Citator logo">`,
        `  </picture>`,
        `  <div class="ec-brand-copy"><span class="ec-brand-title">Equation Citator</span><span class="ec-brand-subtitle">Documentation</span></div>`,
        `</a>`,
        buildLocaleBadge(navigation.locale),
        buildSidebarGroup("Tutorials", tutorialsIndexHref, navigation.tutorials, outputFilePath, currentPageHref, currentSection === "tutorials"),
        buildSidebarGroup("ChangeLogs", changelogsIndexHref, navigation.changelogs, outputFilePath, currentPageHref, currentSection === "changelogs"),
        buildSimpleApiGroup(apiIndexHref, modulesHref, hierarchyHref, currentPageHref),
    ].join("");
}

function buildLocaleBadge(locale) {
    return [
        '<section class="ec-sidebar-meta">',
        '  <div class="ec-sidebar-group-title">Language</div>',
        `  <div class="ec-locale-pill">${escapeHtml(getLocaleLabel(locale))}</div>`,
        "</section>",
    ].join("");
}

function buildSidebarGroup(title, indexHref, pages, outputFilePath, currentPageHref, isCurrentSection) {
    const groupBasePath = title === "Tutorials" ? "tutorials/index.html" : "changelogs/index.html";
    const isOverviewPage = normalizePath(currentPageHref) === groupBasePath;
    const pageLinks = pages
        .map(page => {
            const href = normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath));
            const activeClass = normalizePath(currentPageHref) === normalizePath(page.urlFromDocsRoot) ? " ec-nav-link-active" : "";
            return `<a class="ec-nav-link${activeClass}" href="${href}">${escapeHtml(page.title)}</a>`;
        })
        .join("");

    return [
        `<section class="ec-sidebar-group${isCurrentSection ? " ec-sidebar-group-active" : ""}">`,
        `  <div class="ec-sidebar-group-title">${title}</div>`,
        `  <a class="ec-nav-link${isOverviewPage ? " ec-nav-link-active" : ""}" href="${indexHref}">${title} overview</a>`,
        pageLinks,
        `</section>`,
    ].join("");
}

function buildSimpleApiGroup(apiIndexHref, modulesHref, hierarchyHref, currentPageHref) {
    const normalizedCurrentHref = normalizePath(currentPageHref);
    const isApiPage = normalizedCurrentHref.startsWith("api/");
    return [
        `<section class="ec-sidebar-group${isApiPage ? " ec-sidebar-group-active" : ""}">`,
        '  <div class="ec-sidebar-group-title">API Documentation</div>',
        `  <a class="ec-nav-link${normalizedCurrentHref === "api/index.html" ? " ec-nav-link-active" : ""}" href="${apiIndexHref}">API overview</a>`,
        `  <a class="ec-nav-link${normalizedCurrentHref === "api/modules.html" ? " ec-nav-link-active" : ""}" href="${modulesHref}">Module index</a>`,
        `  <a class="ec-nav-link${normalizedCurrentHref === "api/hierarchy.html" ? " ec-nav-link-active" : ""}" href="${hierarchyHref}">Type hierarchy</a>`,
        "</section>",
    ].join("");
}

function buildApiSidebarNavigation({ currentPageHref, outputFilePath, navigation }) {
    const homeHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsRoot, "index.html")));
    const relativeAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), docsAssetsRoot));
    const tutorialsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsTutorialsRoot, "index.html")));
    const changelogsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsChangelogsRoot, "index.html")));
    const apiIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "index.html")));
    const modulesHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "modules.html")));
    const hierarchyHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "hierarchy.html")));

    return [
        `<a class="ec-brand" href="${homeHref}">`,
        `  <picture class="ec-brand-mark">`,
        `    <source media="(prefers-color-scheme: dark)" srcset="${relativeAssetsHref}/logo-dark.png">`,
        `    <img src="${relativeAssetsHref}/logo-light.png" alt="Equation Citator logo">`,
        `  </picture>`,
        `  <div class="ec-brand-copy"><span class="ec-brand-title">Equation Citator</span><span class="ec-brand-subtitle">Documentation</span></div>`,
        `</a>`,
        buildLocaleBadge(navigation.locale),
        buildSidebarGroup("Tutorials", tutorialsIndexHref, navigation.tutorials, outputFilePath, currentPageHref, false),
        buildSidebarGroup("ChangeLogs", changelogsIndexHref, navigation.changelogs, outputFilePath, currentPageHref, false),
        buildSimpleApiGroup(apiIndexHref, modulesHref, hierarchyHref, currentPageHref),
        '<section class="ec-sidebar-group ec-sidebar-group-api-detail">',
        '  <div class="ec-sidebar-group-title">Generated reference</div>',
    ].join("");
}

function buildOnPageToc(tocItems) {
    const filteredItems = tocItems.filter(item => item.level === 2 || item.level === 3);
    if (filteredItems.length === 0) {
        return "";
    }

    const links = filteredItems
        .map(item => `<a class="ec-toc-link ec-toc-level-${item.level}" href="#${item.id}">${escapeHtml(item.text)}</a>`)
        .join("");

    return `<nav class="ec-toc"><div class="ec-sidebar-group-title">On this page</div>${links}</nav>`;
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
    for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
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

function slugifyHeading(text) {
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
        .replace(/^-+|-+$/g, "");
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
    return text.replaceAll("[", "\\[").replaceAll("]", "\\]");
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

function getSectionCardKicker(sectionKey) {
    return sectionKey === "tutorials" ? "Tutorial" : "Release series";
}

function getLocaleLabel(locale) {
    return locale === "zh-CN" ? "Simplified Chinese" : "English";
}

function getHtmlLang(locale) {
    return locale === "zh-CN" ? "zh-CN" : "en";
}

function getApiIntroCopy() {
    return "The API reference is generated from the source code and shares the same documentation shell as the tutorials and changelogs.";
}

function resolveRequestedLocale(argumentsList) {
    const localeArgument = argumentsList.find(argument => argument.startsWith("--locale="));
    const requestedLocale = localeArgument?.slice("--locale=".length) || DEFAULT_LOCALE;
    if (SUPPORTED_LOCALES.has(requestedLocale)) {
        return requestedLocale;
    }

    throw new Error(`Unsupported locale "${requestedLocale}". Supported locales: ${Array.from(SUPPORTED_LOCALES).join(", ")}`);
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

function buildSharedCss() {
    return `:root {
  color-scheme: light;
  --ec-bg: #f5efe5;
  --ec-bg-strong: #efe6d7;
  --ec-surface: rgba(255, 252, 247, 0.88);
  --ec-surface-strong: #fffaf2;
  --ec-border: rgba(92, 72, 41, 0.13);
  --ec-border-strong: rgba(92, 72, 41, 0.22);
  --ec-text: #221c14;
  --ec-muted: #6d624f;
  --ec-accent: #0d7b69;
  --ec-accent-soft: rgba(13, 123, 105, 0.12);
  --ec-shadow: 0 22px 60px rgba(79, 60, 32, 0.12);
  --ec-sidebar-width: 320px;
  --ec-radius: 24px;
  --ec-radius-sm: 16px;
  --ec-code-bg: rgba(33, 27, 21, 0.07);
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --ec-bg: #12161b;
    --ec-bg-strong: #182028;
    --ec-surface: rgba(23, 29, 37, 0.92);
    --ec-surface-strong: #1b2129;
    --ec-border: rgba(255, 255, 255, 0.08);
    --ec-border-strong: rgba(255, 255, 255, 0.16);
    --ec-text: #edf1f4;
    --ec-muted: #a8b0bc;
    --ec-accent: #58ceb3;
    --ec-accent-soft: rgba(88, 206, 179, 0.14);
    --ec-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
    --ec-code-bg: rgba(255, 255, 255, 0.08);
  }
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(13, 123, 105, 0.15), transparent 28%),
    radial-gradient(circle at bottom right, rgba(196, 141, 68, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 28%),
    var(--ec-bg);
  color: var(--ec-text);
  font-family: "Aptos", "Segoe UI", "Helvetica Neue", sans-serif;
}

body {
  line-height: 1.65;
}

a {
  color: var(--ec-accent);
}

.ec-docs-page .ec-layout {
  display: grid;
  grid-template-columns: minmax(280px, var(--ec-sidebar-width)) minmax(0, 1fr);
  min-height: 100vh;
}

.ec-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  min-height: 100vh;
  padding: 28px 22px;
  box-sizing: border-box;
  border-right: 1px solid var(--ec-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 28%),
    var(--ec-surface);
  backdrop-filter: blur(16px);
}

.ec-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 28px;
  padding: 30px;
  box-sizing: border-box;
}

.ec-content {
  background: var(--ec-surface);
  border: 1px solid var(--ec-border);
  border-radius: var(--ec-radius);
  box-shadow: var(--ec-shadow);
  padding: 34px 40px;
  overflow: hidden;
}

.ec-content > :first-child {
  margin-top: 0;
}

.ec-content h1,
.ec-content h2,
.ec-content h3,
.ec-content h4,
.ec-content h5,
.ec-typedoc-page .tsd-page-title h1,
.ec-typedoc-page .tsd-page-title h2 {
  color: var(--ec-text);
  font-family: "Aptos Display", "Trebuchet MS", "Segoe UI", sans-serif;
  line-height: 1.12;
}

.ec-content h1 {
  font-size: 2.35rem;
  margin-bottom: 1.1rem;
}

.ec-content h2 {
  margin-top: 2.6rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--ec-border);
}

.ec-content p,
.ec-content li,
.ec-content blockquote,
.ec-typedoc-page .tsd-typography {
  color: var(--ec-text);
}

.ec-content ul,
.ec-content ol {
  padding-left: 1.35rem;
}

.ec-content blockquote {
  margin: 1.35rem 0;
  padding: 0.9rem 1rem;
  border-left: 4px solid var(--ec-accent);
  border-radius: 0 var(--ec-radius-sm) var(--ec-radius-sm) 0;
  background: var(--ec-accent-soft);
}

.ec-content hr {
  border: 0;
  border-top: 1px solid var(--ec-border);
  margin: 2rem 0;
}

.ec-content table,
.ec-typedoc-page table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.25rem 0;
  overflow: hidden;
  border-radius: 14px;
}

.ec-content th,
.ec-content td,
.ec-typedoc-page th,
.ec-typedoc-page td {
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--ec-border);
  text-align: left;
}

.ec-content th,
.ec-typedoc-page th {
  background: rgba(13, 123, 105, 0.08);
}

.ec-content code,
.ec-typedoc-page code {
  background: var(--ec-code-bg);
  border-radius: 8px;
  padding: 0.16rem 0.4rem;
}

.ec-content pre,
.ec-typedoc-page pre {
  background: #10161d;
  color: #eef3f7;
  border-radius: 18px;
  padding: 16px 18px;
  overflow: auto;
}

.ec-content img,
.ec-typedoc-page .tsd-typography img {
  max-width: 100%;
  border-radius: 16px;
}

.ec-lead {
  font-size: 1.06rem;
  color: var(--ec-muted);
  margin-top: 0;
}

.ec-card-grid,
.ec-section-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-top: 22px;
}

.ec-card,
.ec-section-card {
  display: block;
  padding: 22px;
  border-radius: 20px;
  border: 1px solid var(--ec-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 42%),
    var(--ec-surface-strong);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.06);
  color: inherit;
  text-decoration: none;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.ec-card:hover,
.ec-section-card:hover {
  transform: translateY(-2px);
  border-color: var(--ec-border-strong);
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.08);
}

.ec-card h2,
.ec-section-card h2 {
  margin: 0 0 10px;
  border-top: 0;
  padding-top: 0;
  font-size: 1.12rem;
}

.ec-card p,
.ec-section-card p,
.ec-section-intro p {
  margin: 0;
  color: var(--ec-muted);
}

.ec-section-card-kicker {
  display: inline-block;
  margin-bottom: 0.7rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ec-accent);
}

.ec-empty-state {
  margin-top: 1.4rem;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: var(--ec-accent-soft);
  color: var(--ec-muted);
}

.ec-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  text-decoration: none;
  color: inherit;
}

.ec-brand-mark {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--ec-border);
  background: rgba(255, 255, 255, 0.78);
}

.ec-brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ec-brand-copy {
  display: flex;
  flex-direction: column;
}

.ec-brand-title {
  font-size: 1rem;
  font-weight: 700;
}

.ec-brand-subtitle {
  font-size: 0.82rem;
  color: var(--ec-muted);
}

.ec-sidebar-meta {
  margin-bottom: 18px;
}

.ec-locale-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--ec-accent-soft);
  color: var(--ec-text);
  border: 1px solid rgba(13, 123, 105, 0.18);
  font-size: 0.92rem;
  font-weight: 600;
}

.ec-sidebar-group {
  margin-bottom: 22px;
}

.ec-sidebar-group-title {
  margin-bottom: 10px;
  color: var(--ec-muted);
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.ec-sidebar-group-active .ec-sidebar-group-title {
  color: var(--ec-accent);
}

.ec-nav-link {
  display: block;
  padding: 10px 12px;
  border-radius: 13px;
  color: var(--ec-text);
  text-decoration: none;
  margin-bottom: 6px;
  border: 1px solid transparent;
}

.ec-nav-link:hover,
.ec-nav-link-active {
  background: var(--ec-accent-soft);
  border-color: rgba(13, 123, 105, 0.18);
  color: var(--ec-text);
}

.ec-toc {
  position: sticky;
  top: 28px;
  align-self: start;
  background: var(--ec-surface);
  border: 1px solid var(--ec-border);
  border-radius: 18px;
  padding: 18px 16px;
}

.ec-toc-link {
  display: block;
  text-decoration: none;
  color: var(--ec-muted);
  padding: 7px 0;
}

.ec-toc-link:hover {
  color: var(--ec-accent);
}

.ec-toc-level-3 {
  padding-left: 14px;
}

.ec-typedoc-page {
  background:
    radial-gradient(circle at top left, rgba(13, 123, 105, 0.15), transparent 28%),
    radial-gradient(circle at bottom right, rgba(196, 141, 68, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 28%),
    var(--ec-bg);
}

.ec-typedoc-page .tsd-page-toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--ec-border);
}

@media (prefers-color-scheme: dark) {
  .ec-typedoc-page .tsd-page-toolbar {
    background: rgba(18, 24, 31, 0.84);
  }
}

.ec-typedoc-page .container-main {
  max-width: none;
  padding: 28px;
  box-sizing: border-box;
  gap: 28px;
}

.ec-typedoc-page .col-content {
  background: var(--ec-surface);
  border: 1px solid var(--ec-border);
  border-radius: var(--ec-radius);
  box-shadow: var(--ec-shadow);
  padding: 24px 30px;
}

.ec-typedoc-page .col-sidebar {
  position: sticky;
  top: 88px;
  align-self: start;
  max-height: calc(100vh - 110px);
  overflow: auto;
  padding: 22px 18px;
  border-radius: var(--ec-radius);
  background: var(--ec-surface);
  border: 1px solid var(--ec-border);
  box-shadow: var(--ec-shadow);
}

.ec-typedoc-page .site-menu {
  margin-top: 0;
}

.ec-typedoc-page .site-menu nav > a:first-of-type {
  display: inline-flex;
}

.ec-typedoc-page .site-menu nav ul {
  margin-top: 6px;
  padding-left: 1rem;
}

.ec-typedoc-page .page-menu {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--ec-border);
}

.ec-typedoc-page .page-menu a,
.ec-typedoc-page .site-menu a {
  color: var(--ec-text);
}

.ec-typedoc-page .tsd-navigation a.current,
.ec-typedoc-page .tsd-navigation a:hover {
  color: var(--ec-accent);
}

.ec-typedoc-page .tsd-panel,
.ec-typedoc-page .tsd-panel-group,
.ec-typedoc-page .tsd-accordion-summary {
  border-color: var(--ec-border);
}

.ec-typedoc-page .tsd-generator,
.ec-typedoc-page .tsd-page-toolbar .title {
  color: var(--ec-muted);
}

@media (max-width: 1080px) {
  .ec-docs-page .ec-layout,
  .ec-typedoc-page .container-main {
    display: block;
  }

  .ec-sidebar,
  .ec-typedoc-page .col-sidebar {
    position: static;
    min-height: auto;
    max-height: none;
    margin: 18px;
  }

  .ec-main {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .ec-content {
    padding: 24px 22px;
  }

  .ec-toc {
    position: static;
  }
}`;
}

await main();

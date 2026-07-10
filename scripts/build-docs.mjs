import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Application } from "typedoc";
import process from "node:process";
import {
    collectFiles,
    encodeHrefPath,
    normalizePath,
    pathExists,
    prettyTitleFromName,
    stripHtmlTags,
    stripLeadingHeading,
    writeFile,
} from "./docs-pages/docs-utils.mjs";
import { createDocsPageBuilder } from "./docs-pages/docs-page-builder.mjs";
import {
    renderMarkdownDocument,
    transformMarkdownForSection,
} from "./docs-pages/markdown-renderer.mjs";
import { buildSectionIndexContentHtml } from "./docs-pages/page-shell.mjs";
import {
    collectSectionContent,
    getMarkdownFileTitle,
} from "./docs-pages/section-model.mjs";
import {
    GENERATED_SOURCE_ROOT,
    SITE_BASE_URL,
    TYPE_DOC_SOURCE_LINK_TEMPLATE,
    CHANGELOGS_ROOT,
    TUTORIALS_ROOT,
    markdownEnvPath,
    withBaseRoot,
    BASE_ROOT,
} from "./docs-pages/site-config.mjs";

const require = createRequire(import.meta.url);

const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = ["en", "zh-CN"];
const LOCALE_LABELS = new Map([
    ["en", "English"],
    ["zh-CN", "简体中文"],
]);

const repositoryRoot = process.cwd();
const docsPagesRoot = path.join(repositoryRoot, "scripts", "docs-pages");
const readmePath = path.join(repositoryRoot, "README.md");
const readmeZhPath = path.join(repositoryRoot, "README-zh-CN.md");

// This is to set the docs Root folder  
const docsRoot = path.join(repositoryRoot, "docs" + BASE_ROOT);
const docsApiRoot = path.join(docsRoot, "api");
const docsAssetsRoot = path.join(docsRoot, "assets");
const imageRoot = path.join(repositoryRoot, "img");

const tutorialsSectionKey = sectionPathFromRoot(TUTORIALS_ROOT);
const changelogsSectionKey = sectionPathFromRoot(CHANGELOGS_ROOT);
const packageMetadata = JSON.parse(await fs.readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const siteTitle = `Equation Citator v${packageMetadata.version} Documentation`;

const sharedAssets = [
    { source: path.join(imageRoot, "logo-light.png"), target: "logo-light.png" },
    { source: path.join(imageRoot, "logo-dark.png"), target: "logo-dark.png" },
];
const { buildApiShellModel, buildStandardDocsPage } = createDocsPageBuilder({
    siteTitle,
    supportedLocales: SUPPORTED_LOCALES,
    localeLabels: LOCALE_LABELS,
    docsRoot,
    docsApiRoot,
    docsAssetsRoot,
    tutorialsSectionKey,
    changelogsSectionKey,
});

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

/**
 * Builds all non-API pages for one locale and returns the navigation model
 * that TypeDoc/API pages reuse for the shared shell.
 */
async function buildLocaleDocs(locale) {
    const localeDocsRoot = path.join(docsRoot, locale);
    const tutorialSection = await collectLocalizedSectionContent(locale, TUTORIALS_ROOT);
    const changelogSection = await collectLocalizedSectionContent(locale, CHANGELOGS_ROOT);

    const navigation = {
        locale,
        localeDocsRoot,
        tutorialSection,
        changelogSection,
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

/**
 * Collects source and output metadata for a localized docs section.
 * Source and generated paths intentionally share `section/locale`, for example
 * `tutorials/en` -> `docs/tutorials/en`.
 */
async function collectLocalizedSectionContent(locale, sectionKey) {
    const sectionRoot = sectionPathFromRoot(sectionKey);
    const localizedSectionRoot = path.join(sectionRoot, locale);
    const sourceRoot = path.join(repositoryRoot, localizedSectionRoot);
    const outputRoot = path.join(docsRoot, localizedSectionRoot);

    if (!await pathExists(sourceRoot)) {
        throw new Error(`Missing documentation source directory: ${sourceRoot}`);
    }
    await copySectionStaticAssets(sourceRoot, outputRoot);

    return collectSectionContent({
        locale,
        sectionKey: sectionRoot,
        sourceRoot,
        outputRoot,
        docsRoot,
        tutorialsSectionKey,
        changelogsSectionKey,
    });
}

async function cleanDocsOutput() {
    await fs.rm(docsRoot, { recursive: true, force: true });
    await fs.mkdir(docsRoot, { recursive: true });
}


/**
 * Copy the assets shared by all locales into the generated docs assets folder. This includes
 * the site CSS, KaTeX CSS and fonts, and the Equation Citator runtime JS. 
 */
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
    const equationCitatorRuntimePath = require.resolve("@friedparrot/equation-citator/runtime");
    await fs.mkdir(path.join(docsAssetsRoot, "equation-citator"), { recursive: true });
    await fs.copyFile(
        equationCitatorRuntimePath,
        path.join(docsAssetsRoot, "equation-citator", "runtime.js")
    );
    await fs.copyFile(
        `${equationCitatorRuntimePath}.map`,
        path.join(docsAssetsRoot, "equation-citator", "runtime.js.map")
    );
}

/**
 * Copies non-Markdown files colocated with a localized docs section into the
 * matching generated docs folder. This keeps Obsidian embeds rendered by the
 * Equation Citator markdown-it plugin backed by real files, even when those
 * embeds are resolved later from `env.markdownPath` instead of by our markdown
 * line transform.
 */
async function copySectionStaticAssets(sourceRoot, outputRoot) {
    const assetFiles = await collectFiles(sourceRoot, {
        includeFile(filePath) {
            return path.extname(filePath).toLowerCase() !== ".md";
        },
    });

    for (const sourceFilePath of assetFiles) {
        const relativeAssetPath = normalizePath(path.relative(sourceRoot, sourceFilePath));
        const outputFilePath = path.join(outputRoot, relativeAssetPath);
        await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
        await fs.copyFile(sourceFilePath, outputFilePath);
    }
}

/**
 * Renders every navigable page in a collected section. Section intro README
 * content is rendered separately by writeSectionIndex.
 */
async function renderSectionPages(section, navigation) {
    for (const pageInfo of section.pages) {
        const sourceMarkdown = await fs.readFile(pageInfo.sourcePath, "utf8");
        const transformedMarkdown = transformMarkdownForSection(sourceMarkdown);
        const renderedPage = renderMarkdownDocument(transformedMarkdown, getMarkdownFileTitle(pageInfo.sourcePath), {
            markdownPath: markdownEnvPath(sourcePathForMarkdownEnv(pageInfo.sourcePath), GENERATED_SOURCE_ROOT),
        });
        const pageContentHtml = normalizeGeneratedPageRouteLinks(stripLeadingHeading(renderedPage.contentHtml), navigation);
        const pageHtml = buildStandardDocsPage({
            pageTitle: renderedPage.pageHeading,
            pageHeading: renderedPage.pageHeading,
            pageContentHtml,
            currentSection: pageInfo.sectionKey,
            currentPageHref: pageInfo.siteHref,
            navigation,
            tocItems: renderedPage.tocItems,
            outputFilePath: pageInfo.outputPath,
        });

        await writeFile(pageInfo.outputPath, pageHtml);
    }
}

async function buildSectionIntroHtml(section, navigation) {
    if (!section.introPageInfo) {
        return "";
    }

    const sourceMarkdown = await fs.readFile(section.introPageInfo.sourcePath, "utf8");
    const transformedMarkdown = transformMarkdownForSection(sourceMarkdown);
    const renderedPage = renderMarkdownDocument(transformedMarkdown, getMarkdownFileTitle(section.introPageInfo.sourcePath), {
        markdownPath: markdownEnvPath(sourcePathForMarkdownEnv(section.introPageInfo.sourcePath), GENERATED_SOURCE_ROOT),
    });
    return normalizeGeneratedPageRouteLinks(stripLeadingHeading(renderedPage.contentHtml), navigation);
}

async function buildTypeDocApi() {
    const app = await Application.bootstrapWithPlugins({
        options: normalizePath(path.join(repositoryRoot, "typedoc.json")),
        plugin: ["typedoc-github-theme"],
        hostedBaseUrl: SITE_BASE_URL,
        sourceLinkTemplate: TYPE_DOC_SOURCE_LINK_TEMPLATE,
        sourceLinkExternal: true,
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
        const shellModel = buildApiShellModel({
            currentPageHref,
            currentPageLabel,
            outputFilePath: htmlFilePath,
            navigation,
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
            `<a href="${shellModel.homeHref}" class="title ec-site-title">${shellModel.siteTitleHtml}</a>`
        );
        html = html.replace(
            /<div id="tsd-toolbar-links">[\s\S]*?<\/div>/,
            `<div id="tsd-toolbar-links">${shellModel.toolbarLinksHtml}</div>`
        );
        html = html.replace(
            /<div class="site-menu">[\s\S]*?<\/nav><\/div>/,
            `<div class="site-menu">${shellModel.sidebarHtml}</div>`
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
            '<p class="ec-lead">The API reference is generated from the source code and shares the same documentation shell as the tutorials and changelogs.</p>',
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
    const title = prettyTitleFromName(section.sectionKey);
    const introHtml = await buildSectionIntroHtml(section, navigation);
    const pageHtml = buildStandardDocsPage({
        pageTitle: title,
        pageHeading: title,
        showPageHeading: false,
        pageContentHtml: buildSectionIndexContentHtml({
            title,
            description: "",
            introHtml,
            cards: section.pages.map(page => ({
                href: withBaseRoot(page.siteHref),
                title: page.title,
                description: page.description,
                readingTimeLabel: page.readingTimeLabel,
            })),
        }),
        currentSection: section.sectionKey,
        currentPageHref: getDocsRelativeHref(outputFilePath),
        navigation,
        tocItems: [],
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

async function writeDocsLandingPage(navigation) {
    const outputFilePath = path.join(navigation.localeDocsRoot, "index.html");
    const sourceFilePath = navigation.locale === DEFAULT_LOCALE ? readmePath : readmeZhPath;
    await copyDocsLandingPageAssets(navigation.localeDocsRoot);

    const sourceMarkdown = (await fs.readFile(sourceFilePath, "utf8"))
        .replace(/^<center>.*README(?:-zh-CN|_zh)?\.md.*<\/center>\s*$/m, "");
    const transformedMarkdown = transformMarkdownForSection(sourceMarkdown);
    const renderedPage = renderMarkdownDocument(transformedMarkdown, getMarkdownFileTitle(sourceFilePath), {
        markdownPath: markdownEnvPath(sourcePathForMarkdownEnv(sourceFilePath), GENERATED_SOURCE_ROOT),
    });
    const pageHtml = buildStandardDocsPage({
        pageTitle: siteTitle,
        pageHeading: siteTitle,
        showPageHeading: false,
        pageContentHtml: renderedPage.contentHtml,
        currentSection: "home",
        currentPageHref: getDocsRelativeHref(outputFilePath),
        navigation,
        tocItems: renderedPage.tocItems,
        outputFilePath,
    });

    await writeFile(outputFilePath, pageHtml);
}

/**
 * Copies repository-level README assets next to localized landing pages.
 * README HTML uses paths such as `img/example.png`, so each locale root needs
 * a matching `img/` folder after docs generation.
 */
async function copyDocsLandingPageAssets(localeDocsRoot) {
    await fs.cp(imageRoot, path.join(localeDocsRoot, "img"), { recursive: true });
}

async function writeRootRedirect() {
    const outputFilePath = path.join(docsRoot, "index.html");
    const defaultLocaleHref = withBaseRoot("en/index.html");
    const pageHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${defaultLocaleHref}"><link rel="canonical" href="${defaultLocaleHref}"><title>Equation Citator Documentation</title></head><body><p><a href="${defaultLocaleHref}">Open Equation Citator documentation</a></p></body></html>`;
    await writeFile(outputFilePath, pageHtml);
}

function sectionPathFromRoot(sectionRoot) {
    return normalizePath(sectionRoot).replace(/^\/+/, "");
}

function sourcePathForMarkdownEnv(sourcePath) {
    return normalizePath(path.relative(repositoryRoot, sourcePath));
}

function getDocsRelativeHref(filePath) {
    return normalizePath(path.relative(docsRoot, filePath));
}

function normalizeGeneratedPageRouteLinks(contentHtml, navigation) {
    let normalizedHtml = contentHtml;
    for (const { shortHref, fullHref } of buildGeneratedPageRouteReplacements(navigation)) {
        const routeBoundaryPattern = new RegExp(`${escapeRegExp(shortHref)}(?=$|[#"'<&\\s])`, "g");
        normalizedHtml = normalizedHtml.replace(routeBoundaryPattern, fullHref);
    }

    return normalizedHtml.replace(docsPageRoutePattern(), (match, routePath, hashOrBoundary = "") => {
        if (routePath.endsWith("/index.html") || hasStaticAssetExtension(routePath)) {
            return match;
        }

        return `${routePath}/index.html${hashOrBoundary}`;
    });
}

function buildGeneratedPageRouteReplacements(navigation) {
    const pages = [
        ...navigation.tutorials,
        ...navigation.changelogs,
    ];
    return pages
        .map(page => encodeHrefPath(withBaseRoot(page.siteHref)))
        .filter(href => /\/index\.html$/i.test(href))
        .map(fullHref => ({
            fullHref,
            shortHref: fullHref.replace(/\/index\.html$/i, ""),
        }))
        .filter(({ shortHref, fullHref }) => shortHref !== fullHref);
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function docsPageRoutePattern() {
    const baseRoot = escapeRegExp(withBaseRoot(""));
    return new RegExp(`(${baseRoot}(?:tutorials|changelogs)/[^#"'<&\\s]+?)(#|(?=$|["'<&\\s]))`, "g");
}

function hasStaticAssetExtension(routePath) {
    const lastSegment = routePath.split("/").at(-1) ?? "";
    return /\.(?:apng|avif|bmp|css|gif|ico|jpeg|jpg|js|json|map|md|mjs|pdf|png|svg|webp|woff2?|xml)$/i.test(lastSegment);
}

await main();

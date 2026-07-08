import path from "node:path";
import {
    ensureTrailingSlash,
    escapeHtml,
    normalizePath,
} from "./docs-utils.mjs";
import {
    buildDocsPageHtml,
    buildOnPageTocHtml,
    buildSidebarHtml,
    buildToolbarLinksHtml,
} from "./page-shell.mjs";

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

export function createDocsPageBuilder({
    siteTitle,
    supportedLocales,
    localeLabels,
    docsRoot,
    docsApiRoot,
    docsAssetsRoot,
    tutorialsSectionKey,
    changelogsSectionKey,
}) {

    /* Builds the HTML for a standard docs page 
        including the tutorials and changelogs sections.
    */
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
            htmlLang: navigation.locale === "zh-CN" ? "zh-CN" : "en",
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

    // Builds the shell model for an API reference page, including the sidebar with the API reference section. 
    function buildApiShellModel({ currentPageHref, currentPageLabel, outputFilePath, navigation }) {
        const shellModel = buildShellModel({
            currentSection: "api",
            currentPageHref,
            outputFilePath,
            navigation,
            extraSidebarHtml: buildApiReferenceSectionHtml({ currentPageHref, currentPageLabel }),
        });

        return {
            ...shellModel,
            sidebarHtml: buildSidebarHtml(shellModel.sidebar),
            siteTitleHtml: escapeHtml(siteTitle),
            toolbarLinksHtml: buildToolbarLinksHtml(shellModel.toolbarLinks),
        };
    }


    function buildLanguageOptions({ currentLocale, currentPageHref, outputFilePath }) {
        return supportedLocales.map(locale => {
            const targetPath = getLocaleSwitchTargetPath(locale, currentPageHref);
            return {
                href: normalizePath(path.relative(path.dirname(outputFilePath), targetPath)),
                label: localeLabels.get(locale) ?? locale,
                isActive: locale === currentLocale,
            };
        });
    }

    function getLocaleSwitchTargetPath(locale, currentPageHref) {
        const normalizedHref = normalizePath(currentPageHref);
        const parts = normalizedHref.split("/");

        if (supportedLocales.includes(parts[0])) {
            return path.join(docsRoot, locale, ...parts.slice(1));
        }

        if ((parts[0] === tutorialsSectionKey || parts[0] === changelogsSectionKey) && supportedLocales.includes(parts[1])) {
            return path.join(docsRoot, parts[0], locale, ...parts.slice(2));
        }

        return path.join(docsRoot, locale, "index.html");
    }

    function buildShellModel({ currentSection, currentPageHref, outputFilePath, navigation, extraSidebarHtml = "" }) {
        const homeHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(navigation.localeDocsRoot, "index.html")));
        const tutorialsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(navigation.tutorialSection.outputRoot, "index.html")));
        const changelogsIndexHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(navigation.changelogSection.outputRoot, "index.html")));
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
                isActive: normalizedCurrentHref === getDocsRelativeHref(path.join(navigation.tutorialSection.outputRoot, "index.html")),
            },
            ...navigation.tutorials.map(page => ({
                href: normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath)),
                label: page.title,
                isActive: normalizedCurrentHref === normalizePath(page.siteHref),
            })),
        ];
        const changelogLinks = [
            {
                href: changelogsIndexHref,
                label: "ChangeLogs overview",
                isActive: normalizedCurrentHref === getDocsRelativeHref(path.join(navigation.changelogSection.outputRoot, "index.html")),
            },
            ...navigation.changelogs.map(page => ({
                href: normalizePath(path.relative(path.dirname(outputFilePath), page.outputPath)),
                label: page.title,
                isActive: normalizedCurrentHref === normalizePath(page.siteHref),
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
            { href: tutorialsIndexHref, label: "Tutorials", isActive: currentSection === tutorialsSectionKey },
            { href: apiIndexHref, label: "API", isActive: currentSection === "api" },
        ];
        if (changelogLinks.length > 0) {
            toolbarLinks.splice(1, 0, { href: changelogsIndexHref, label: "ChangeLogs", isActive: currentSection === changelogsSectionKey });
        }

        const sidebarSections = [
            { title: "Tutorials", isActive: currentSection === tutorialsSectionKey, links: tutorialLinks },
            { title: "API Documentation", isActive: normalizedCurrentHref.startsWith("api/"), links: apiLinks },
        ];
        if (changelogLinks.length > 0) {
            sidebarSections.splice(1, 0, { title: "ChangeLogs", isActive: currentSection === changelogsSectionKey, links: changelogLinks });
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

    function getDocsRelativeHref(filePath) {
        return normalizePath(path.relative(docsRoot, filePath));
    }

    return {
        buildApiShellModel,
        buildStandardDocsPage,
    };
}

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
import localeRouting from "./locale-routing.cjs";
import { withBaseRoot } from "./site-config.mjs";

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


    function buildLanguageOptions({ currentLocale, currentPageHref }) {
        return supportedLocales.map(locale => {
            const targetHref = getLocaleSwitchTargetHref(locale, currentPageHref);
            return {
                href: relativeSiteHref(currentPageHref, targetHref),
                label: localeLabels.get(locale) ?? locale,
                isActive: locale === currentLocale,
            };
        });
    }

    function getLocaleSwitchTargetHref(locale, currentPageHref) {
        return localeRouting.getLocaleSwitchTargetHref({
            locale,
            currentPageHref,
            supportedLocales,
            tutorialsSectionKey,
            changelogsSectionKey,
        });
    }

    function buildShellModel({ currentSection, currentPageHref, outputFilePath, navigation, extraSidebarHtml = "" }) {
        const homeHref = relativeSiteHref(currentPageHref, getDocsRelativeHref(path.join(navigation.localeDocsRoot, "index.html")));
        const tutorialsIndexHref = relativeSiteHref(currentPageHref, getDocsRelativeHref(path.join(navigation.tutorialSection.outputRoot, "index.html")));
        const changelogsIndexHref = relativeSiteHref(currentPageHref, getDocsRelativeHref(path.join(navigation.changelogSection.outputRoot, "index.html")));
        const apiIndexHref = relativeSiteHref(currentPageHref, "api/index.html");
        const modulesHref = relativeSiteHref(currentPageHref, "api/modules.html");
        const hierarchyHref = relativeSiteHref(currentPageHref, "api/hierarchy.html");
        const docsAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), docsAssetsRoot));
        const typedocAssetsHref = normalizePath(path.relative(path.dirname(outputFilePath), path.join(docsApiRoot, "assets")));
        const typedocBaseHref = ensureTrailingSlash(normalizePath(path.relative(path.dirname(outputFilePath), docsApiRoot))) || "./";
        const normalizedCurrentHref = normalizePath(currentPageHref);
        const hasChangelogSection = Boolean(navigation.changelogSection);

        const tutorialLinks = navigation.tutorials.map(page => ({
                href: relativeSiteHref(currentPageHref, page.siteHref),
                label: page.title,
                isActive: normalizedCurrentHref === normalizePath(page.siteHref),
            }));
        const changelogLinks = navigation.changelogs.map(page => ({
                href: relativeSiteHref(currentPageHref, page.siteHref),
                label: page.title,
                isActive: normalizedCurrentHref === normalizePath(page.siteHref),
            }));
        const apiLinks = [
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
            { href: "https://friedparrot.github.io/", label: "My Website", isActive: false, isExternal: true },
        ];
        if (hasChangelogSection) {
            toolbarLinks.splice(1, 0, { href: changelogsIndexHref, label: "ChangeLogs", isActive: currentSection === changelogsSectionKey });
        }

        const sidebarSections = [
            { title: "Tutorials", href: tutorialsIndexHref, isActive: currentSection === tutorialsSectionKey, links: tutorialLinks },
            { title: "API Documentation", href: apiIndexHref, isActive: normalizedCurrentHref.startsWith("api/"), links: apiLinks },
        ];
        if (hasChangelogSection) {
            sidebarSections.splice(1, 0, { title: "ChangeLogs", href: changelogsIndexHref, isActive: currentSection === changelogsSectionKey, links: changelogLinks });
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
                }),
                sections: sidebarSections,
                extraHtml: extraSidebarHtml,
            },
        };
    }

    function getDocsRelativeHref(filePath) {
        return normalizePath(path.relative(docsRoot, filePath));
    }

    function relativeSiteHref(currentPageHref, targetPageHref) {
        void currentPageHref;
        return withBaseRoot(targetPageHref);
    }

    return {
        buildApiShellModel,
        buildStandardDocsPage,
    };
}

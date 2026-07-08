function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
}

export function buildToolbarLinksHtml(links) {
    if (!links || links.length === 0) {
        return "";
    }

    const linkHtml = links
        .map(link => {
            const activeClass = link.isActive ? " ec-toolbar-link-active" : "";
            return `<a class="ec-toolbar-link${activeClass}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
        })
        .join("");

    return `<div class="ec-toolbar-links" aria-label="Primary">${linkHtml}</div>`;
}

export function buildSidebarHtml({ homeHref, logoLightHref, logoDarkHref, languageOptions, sections, extraHtml = "" }) {
    const sectionHtml = sections
        .map(section => {
            const activeClass = section.isActive ? " ec-sidebar-group-active" : "";
            const linksHtml = section.links
                .map(link => {
                    const linkActiveClass = link.isActive ? " ec-nav-link-active" : "";
                    return `<a class="ec-nav-link${linkActiveClass}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
                })
                .join("");

            return [
                `<section class="ec-sidebar-group${activeClass}">`,
                `  <div class="ec-sidebar-group-title">${escapeHtml(section.title)}</div>`,
                `  ${linksHtml}`,
                "</section>",
            ].join("");
        })
        .join("");
    const languageOptionsHtml = languageOptions
        .map(option => {
            const selectedAttribute = option.isActive ? " selected" : "";
            return `<option value="${escapeHtml(option.href)}"${selectedAttribute}>${escapeHtml(option.label)}</option>`;
        })
        .join("");

    return [
        '<nav class="tsd-navigation ec-docs-sidebar">',
        `  <a class="ec-brand" href="${escapeHtml(homeHref)}">`,
        '    <span class="ec-brand-mark">',
        `      <img class="ec-brand-logo ec-brand-logo-light" src="${escapeHtml(logoLightHref)}" alt="Equation Citator logo">`,
        `      <img class="ec-brand-logo ec-brand-logo-dark" src="${escapeHtml(logoDarkHref)}" alt="Equation Citator logo">`,
        "    </span>",
        '    <div class="ec-brand-copy"><span class="ec-brand-title">Equation Citator</span><span class="ec-brand-subtitle">Documentation</span></div>',
        "  </a>",
        '  <section class="ec-sidebar-meta">',
        '    <label class="ec-sidebar-group-title" for="ec-language-select">Language</label>',
        `    <select class="ec-language-select" id="ec-language-select" aria-label="Language" onchange="if (this.value) window.location.href = this.value">${languageOptionsHtml}</select>`,
        "  </section>",
        sectionHtml,
        extraHtml,
        "</nav>",
    ].join("");
}

export function buildThemeToggleHtml() {
    return [
        '<div class="tsd-theme-toggle">',
        '  <label class="settings-label" for="tsd-theme">Theme</label>',
        '  <select id="tsd-theme">',
        '    <option value="os">OS</option>',
        '    <option value="light">Light</option>',
        '    <option value="dark">Dark</option>',
        "  </select>",
        "</div>",
    ].join("");
}

export function buildOnPageTocHtml(tocItems) {
    const filteredItems = tocItems.filter(item => item.level === 2 || item.level === 3);
    if (filteredItems.length === 0) {
        return "";
    }

    const linksHtml = filteredItems
        .map(item => `<a href="#${escapeHtml(item.id)}"><span>${escapeHtml(item.text)}</span></a>`)
        .join("");

    return [
        '<details open class="tsd-accordion tsd-page-navigation">',
        '  <summary class="tsd-accordion-summary">',
        '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><use href="#icon-chevronDown"></use></svg>',
        "    <h3>On This Page</h3>",
        "  </summary>",
        `  <div class="tsd-accordion-details">${linksHtml}</div>`,
        "</details>",
    ].join("");
}

export function buildSectionIndexContentHtml({ title, description, introHtml, cards }) {
   
    const descriptionHtml = description ? `<p class="ec-lead">${escapeHtml(description)}</p>` : "";
    const introBlock = introHtml ? `<div class="ec-section-intro">${introHtml}</div>` : descriptionHtml;

    const cardsHtml = cards.length === 0 ?
        '<div class="tsd-alert tsd-alert-note"><div class="tsd-alert-title">No pages</div><div class="tsd-alert-body">No pages are available in this section for the current locale yet.</div></div>' :
        [
            `<div class="ec-section-card-grid" aria-label="${escapeHtml(title)} pages">`,
            ...cards.map(card => [
                `  <a class="ec-section-card" href="${escapeHtml(card.href)}">`,
                `    <h2>${escapeHtml(card.title)}</h2>`,
                card.description ? `    <p>${escapeHtml(card.description)}</p>` : "",
                `    <span class="ec-section-card-time">${escapeHtml(card.readingTimeLabel)}</span>`,
                "  </a>",
            ].join("")),
            "</div>",
        ].join("");

    return `${introBlock}${cardsHtml}`;
}

export function buildDocsPageHtml({
    htmlLang,
    typedocBaseHref,
    documentTitle,
    siteTitle,
    titleHref,
    toolbarLinksHtml,
    sidebarHtml,
    pageHeading,
    showPageHeading,
    pageContentHtml,
    tocHtml,
    typedocAssetsHref,
    docsAssetsHref,
}) {
    const headingHtml = showPageHeading ? `<div class="tsd-page-title"><h1>${escapeHtml(pageHeading)}</h1></div>` : "";

    return `<!DOCTYPE html>
<html class="default" lang="${escapeHtml(htmlLang)}" data-base="${escapeHtml(typedocBaseHref)}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(documentTitle)}</title>
  <meta name="description" content="Documentation for Equation Citator">
  <link rel="stylesheet" href="${escapeHtml(typedocAssetsHref)}/style.css">
  <link rel="stylesheet" href="${escapeHtml(typedocAssetsHref)}/highlight.css">
  <script defer src="${escapeHtml(typedocAssetsHref)}/main.js"></script>
  <script async src="${escapeHtml(typedocAssetsHref)}/icons.js" id="tsd-icons-script"></script>
  <script type="module">
    import { install } from "${escapeHtml(docsAssetsHref)}/equation-citator/runtime.js";
    install();
  </script>
  <link rel="stylesheet" href="${escapeHtml(docsAssetsHref)}/katex/katex.min.css">
  <link rel="stylesheet" href="${escapeHtml(typedocAssetsHref)}/typedoc-github-style.css">
  <link rel="stylesheet" href="${escapeHtml(docsAssetsHref)}/docs-site.css">
</head>
<body class="ec-docs-page">
  <script>document.documentElement.dataset.theme = localStorage.getItem("tsd-theme") || "os";document.body.style.display="none";setTimeout(() => window.app?app.showPage():document.body.style.removeProperty("display"),500)</script>
  <header class="tsd-page-toolbar">
    <div class="tsd-toolbar-contents container">
      <div class="ec-toolbar-spacer" aria-hidden="true"></div>
      <a href="${escapeHtml(titleHref)}" class="title ec-site-title">${escapeHtml(siteTitle)}</a>
      <div id="tsd-toolbar-links">${toolbarLinksHtml}</div>
    </div>
  </header>
  <div class="container container-main">
    <div class="col-content">
      <article class="tsd-panel tsd-typography ec-docs-article">
        ${headingHtml}
        ${pageContentHtml}
      </article>
    </div>
    <div class="col-sidebar">
      <div class="page-menu">${buildThemeToggleHtml()}${tocHtml}</div>
      <div class="site-menu">${sidebarHtml}</div>
    </div>
  </div>
</body>
</html>`;
}

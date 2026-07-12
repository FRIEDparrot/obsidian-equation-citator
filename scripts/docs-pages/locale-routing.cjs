const path = require("node:path");

/**
 * Returns the target href for the language picker on a docs page.
 *
 * Tutorial and changelog pages switch to the matching locale index page because
 * the translated article filenames do not stay aligned across languages.
 */
function getLocaleSwitchTargetHref({
    locale,
    currentPageHref,
    supportedLocales,
    tutorialsSectionKey,
    changelogsSectionKey,
}) {
    const normalizedHref = String(currentPageHref).replaceAll("\\", "/");
    const parts = normalizedHref.split("/");

    if ((parts[0] === tutorialsSectionKey || parts[0] === changelogsSectionKey) && supportedLocales.includes(parts[1])) {
        return path.posix.join(parts[0], locale, "index.html");
    }

    if (supportedLocales.includes(parts[0])) {
        return path.posix.join(locale, ...parts.slice(1));
    }

    return path.posix.join(locale, "index.html");
}

module.exports = {
    getLocaleSwitchTargetHref,
};

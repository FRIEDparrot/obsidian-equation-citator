/**
 * Finds the style of a specified class name in the stylesheet and returns an inline style string for <span style="...">.
 * If not found, returns the default style string.
 * 
 * @param className - The class name to find, without the '.' (e.g., "em-math-citation-print")
 * @param defaultStyle - The default style string (e.g., "color: black; font-size: 14px;")
 * @returns The style string suitable for the style attribute
 */
export function getStyleFromStyleSheet(className: string, defaultStyle: string): string {
    const selector = `.${className}`;
    const styleSheets =  Array.from(document.styleSheets); 

    for (const sheet of styleSheets) {
        let rules: CSSRule[];
        try {
            rules = Array.from(sheet.cssRules);
        } catch (e) {
            // Skip stylesheets that are cross-origin or inaccessible
            continue;
        }
        for (const rule of rules) {
            if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
                const styleText = rule.style.cssText.trim();
                if (styleText.length > 0) {
                    return styleText.endsWith(';') ? styleText : styleText + ';';
                }
                break;  // If found but empty, can break early
            }
        }
    }
    return defaultStyle;
}

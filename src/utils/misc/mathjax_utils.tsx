/**
 * Forces a refresh of MathJax rendering within a specified container.
 * 
 * Re-typesets all mathematical expressions in the target element to ensure
 * proper rendering. This is useful when math content has been dynamically
 * updated or when display issues occur.
 * 
 * @param container - Optional HTML element to refresh. If not provided, 
 *                    defaults to `this.viewPanel`.
 * @returns A promise that resolves when the typesetting is complete.
 * 
 * @example
 * ```typescript
 * equationDiv.replaceChildren(window.MathJax!.tex2chtml(eqTag.content, { display: true }));  // Render new math
 * // Refresh math in a specific element
 * await forceMathRefresh(myElement);
 * 
 * // Refresh math in the default view panel
 * await forceMathRefresh();
 * ```
 */
export async function forceMathRefresh(container ?: HTMLElement) {
    // Pick the math container if not provided
    const el = container ?? this.viewPanel;
    if (!el) return;
    try {
        // Re-typeset only within this panel to avoid global work
        await window.MathJax!.typesetPromise([el]);
    } catch (e) {
        console.error("Math refresh failed", e);
    }
}
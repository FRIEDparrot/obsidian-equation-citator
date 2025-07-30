import { getStyleFromStyleSheet } from "@/styles/pdfRenderStyles";

describe("getStyleFromStyleSheet", () => {
    const cssText = `
        .em-math-citation-print {
            font-family: "Latin Modern Roman", "Latin Modern Math", "CMU Serif", "Computer Modern", serif;
            color: #000000;
            text-decoration: none;
            display: inline;
        }
    `;
    beforeAll(() => {
        // inject style into document 
        const style = document.createElement("style");
        style.innerHTML = cssText;
        document.head.appendChild(style);
    });

    test("should extract style from .em-math-citation-print", () => {
        const result = getStyleFromStyleSheet("em-math-citation-print", "color: blue;");
        expect(result).toContain("color: #000000");
        expect(result).toContain("text-decoration: none");
        expect(result).toContain("display: inline");
        expect(result).toContain("font-family:");
    });

    test("should fallback to default style if class not found", () => {
        const result = getStyleFromStyleSheet("non-existent-class", "color: magenta;");
        expect(result).toBe("color: magenta;");
    });

    test("should append semicolon if missing", () => {
        const style = document.createElement("style");
        style.innerHTML = `.no-semicolon { color: green }`; // intentionally no ;
        document.head.appendChild(style);

        const result = getStyleFromStyleSheet("no-semicolon", "color: black;");
        expect(result.endsWith(";")).toBe(true);
        expect(result).toContain("color: green");
    });
});
